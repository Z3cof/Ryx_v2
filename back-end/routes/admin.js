const express = require('express');
const mongoose = require('mongoose');
const asyncHandler = require('../middleware/asyncHandler');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Quest = require('../models/Quest');
const UserProgress = require('../models/UserProgress');
const MonthlyBudget = require('../models/MonthlyBudget');

const router = express.Router();

// ─── Middleware de protection admin ──────────────────────────────────────────
function adminAuth(req, res, next) {
  const secret = req.headers['x-admin-secret'];
  const expected = process.env.ADMIN_SECRET;
  if (!expected) {
    return res.status(503).json({ error: 'Admin non configuré (ADMIN_SECRET manquant dans .env).' });
  }
  if (!secret || secret !== expected) {
    return res.status(401).json({ error: 'Accès admin refusé.' });
  }
  next();
}

router.use(adminAuth);

// ─── KPIs globaux ─────────────────────────────────────────────────────────────
router.get('/stats', asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const startOfLastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

  const [
    totalUsers,
    newUsersThisMonth,
    newUsersLastMonth,
    activeUsersThisMonth,
    completedQuestsThisMonth,
    totalCompletedQuests,
    totalMessages,
    messagesThisMonth,
    totalTransactions,
    activeQuests,
    expiredQuests,
    totalXp,
    pushTokens,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: startOfMonth } }),
    User.countDocuments({ createdAt: { $gte: startOfLastMonth, $lt: startOfMonth } }),
    Transaction.distinct('userId', { createdAt: { $gte: startOfMonth } }).then(ids => ids.length),
    Quest.countDocuments({ status: 'completed', completedAt: { $gte: startOfMonth } }),
    Quest.countDocuments({ status: 'completed' }),
    Quest.aggregate([{ $group: { _id: null, total: { $sum: 1 } } }]).then(r => r[0]?.total ?? 0),
    Quest.countDocuments({ createdAt: { $gte: startOfMonth } }),
    Transaction.countDocuments(),
    Quest.countDocuments({ status: 'active' }),
    Quest.countDocuments({ status: 'expired' }),
    UserProgress.aggregate([{ $group: { _id: null, total: { $sum: '$xp' } } }]).then(r => r[0]?.total ?? 0),
    User.countDocuments({ pushToken: { $ne: null } }),
  ]);

  res.json({
    totalUsers,
    newUsersThisMonth,
    newUsersLastMonth,
    activeUsersThisMonth,
    completedQuestsThisMonth,
    totalCompletedQuests,
    totalMessages,
    messagesThisMonth,
    totalTransactions,
    activeQuests,
    expiredQuests,
    totalXp,
    pushTokens,
  });
}));

// ─── Gestion des utilisateurs ─────────────────────────────────────────────────
router.get('/users', asyncHandler(async (req, res) => {
  const { search = '', page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter = search
    ? {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-password -avatar -pushToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    User.countDocuments(filter),
  ]);

  res.json({ users, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
}));

router.patch('/users/:id/suspend', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
  // On toggle un champ suspended (ajouté dynamiquement)
  const suspended = !(user.suspended);
  await User.findByIdAndUpdate(req.params.id, { suspended });
  res.json({ suspended });
}));

router.delete('/users/:id', asyncHandler(async (req, res) => {
  const result = await User.deleteOne({ _id: req.params.id });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Utilisateur introuvable.' });
  res.json({ ok: true });
}));

// ─── Activité plateforme (agrégés, anonymisés) ───────────────────────────────
router.get('/platform', asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [
    totalTransactions,
    transactionsThisMonth,
    totalBudgets,
    topCategories,
    activeInactive,
  ] = await Promise.all([
    Transaction.countDocuments(),
    Transaction.countDocuments({ createdAt: { $gte: startOfMonth } }),
    MonthlyBudget.countDocuments(),
    Transaction.aggregate([
      { $match: { type: 'out' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    // Utilisateurs actifs (ont une transaction ce mois) vs inactifs
    Promise.all([
      Transaction.distinct('userId', { createdAt: { $gte: startOfMonth } }).then(ids => ids.length),
      User.countDocuments(),
    ]).then(([active, total]) => ({ active, inactive: total - active })),
  ]);

  res.json({
    totalTransactions,
    transactionsThisMonth,
    totalBudgets,
    topCategories: topCategories.map(c => ({ name: c._id || 'Autre', count: c.count })),
    activeUsers: activeInactive.active,
    inactiveUsers: activeInactive.inactive,
  });
}));

// ─── RyxQuest stats ───────────────────────────────────────────────────────────
router.get('/quests', asyncHandler(async (req, res) => {
  const [statusBreakdown, difficultyBreakdown, aiVsStatic, totalXp, completionRate] = await Promise.all([
    Quest.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Quest.aggregate([{ $group: { _id: '$difficulty', count: { $sum: 1 } } }]),
    Quest.aggregate([{ $group: { _id: '$generatedByAi', count: { $sum: 1 } } }]),
    UserProgress.aggregate([{ $group: { _id: null, total: { $sum: '$xp' }, quests: { $sum: '$totalQuestsCompleted' } } }]),
    Quest.countDocuments({ status: 'completed' }).then(async (completed) => {
      const total = await Quest.countDocuments();
      return total > 0 ? Math.round((completed / total) * 100) : 0;
    }),
  ]);

  res.json({
    statusBreakdown: Object.fromEntries(statusBreakdown.map(s => [s._id, s.count])),
    difficultyBreakdown: Object.fromEntries(difficultyBreakdown.map(d => [d._id, d.count])),
    aiVsStatic: Object.fromEntries(aiVsStatic.map(a => [a._id ? 'ai' : 'static', a.count])),
    totalXpDistributed: totalXp[0]?.total ?? 0,
    totalQuestsCompleted: totalXp[0]?.quests ?? 0,
    completionRate,
  });
}));

// ─── Notifications push stats ─────────────────────────────────────────────────
router.get('/notifications/stats', asyncHandler(async (req, res) => {
  const [totalTokens, withToken] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ pushToken: { $ne: null } }),
  ]);

  res.json({
    totalUsers: totalTokens,
    usersWithPushToken: withToken,
    usersWithoutPushToken: totalTokens - withToken,
    adoptionRate: totalTokens > 0 ? Math.round((withToken / totalTokens) * 100) : 0,
  });
}));

// ─── Santé système ────────────────────────────────────────────────────────────
router.get('/security', asyncHandler(async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStateMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

  const recentUsers = await User.find()
    .select('name email createdAt')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  res.json({
    dbStatus: dbStateMap[dbState] ?? 'unknown',
    dbReadyState: dbState,
    uptime: process.uptime(),
    nodeVersion: process.version,
    recentSignups: recentUsers.map(u => ({
      name: u.name,
      email: u.email,
      createdAt: u.createdAt,
    })),
    memoryUsage: process.memoryUsage(),
  });
}));

// ─── Envoyer une notification push groupée ───────────────────────────────────
router.post('/notifications/send-global', asyncHandler(async (req, res) => {
  const { title, body } = req.body;
  if (!title || !body) {
    return res.status(400).json({ error: 'Titre et corps requis.' });
  }

  const users = await User.find({ pushToken: { $ne: null } }).select('pushToken');
  const tokens = users.map(u => u.pushToken).filter(Boolean);

  if (tokens.length === 0) {
    return res.status(200).json({ success: true, sentCount: 0, message: 'Aucun token push actif disponible.' });
  }

  const { sendPushNotification } = require('../services/pushNotificationService');
  let sentCount = 0;

  await Promise.all(tokens.map(async (token) => {
    try {
      await sendPushNotification(token, title, body, { type: 'global_admin' });
      sentCount++;
    } catch (err) {
      console.error(`[Admin Send] Erreur envoi vers ${token}:`, err);
    }
  }));

  res.status(200).json({ success: true, sentCount, message: `${sentCount} notifications envoyées avec succès.` });
}));

// ─── Série temporelle d'activité (pour le graphique linéaire) ─────────────────
// Retourne le nombre de transactions créées par jour sur les N derniers jours
router.get('/activity', asyncHandler(async (req, res) => {
  const days = Math.min(Number(req.query.days) || 14, 90);
  const now = new Date();
  const from = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days + 1,
    0, 0, 0, 0
  ));

  const [transactionSeries, userSeries] = await Promise.all([
    // Transactions créées par jour
    Transaction.aggregate([
      { $match: { createdAt: { $gte: from } } },
      {
        $group: {
          _id: {
            y: { $year: '$createdAt' },
            m: { $month: '$createdAt' },
            d: { $dayOfMonth: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.y': 1, '_id.m': 1, '_id.d': 1 } },
    ]),
    // Nouvelles inscriptions par jour
    User.aggregate([
      { $match: { createdAt: { $gte: from } } },
      {
        $group: {
          _id: {
            y: { $year: '$createdAt' },
            m: { $month: '$createdAt' },
            d: { $dayOfMonth: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.y': 1, '_id.m': 1, '_id.d': 1 } },
    ]),
  ]);

  // Construire un tableau complet des N jours (avec 0 pour les jours sans data)
  const result = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days + 1 + i));
    const key = { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
    const txDay = transactionSeries.find(r => r._id.y === key.y && r._id.m === key.m && r._id.d === key.d);
    const userDay = userSeries.find(r => r._id.y === key.y && r._id.m === key.m && r._id.d === key.d);
    result.push({
      date: d.toISOString().slice(0, 10),
      label: `${key.d}/${key.m}`,
      transactions: txDay?.count ?? 0,
      newUsers: userDay?.count ?? 0,
    });
  }

  res.json(result);
}));

// ─── Stats Rixy IA (métriques quêtes IA comme proxy) ─────────────────────────
router.get('/rixy/stats', asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const startOfLastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

  const [
    totalAiQuests,
    aiQuestsThisMonth,
    aiQuestsLastMonth,
    aiQuestsCompleted,
    aiQuestsFailed,
    difficultyBreakdown,
    dailyAiActivity,
  ] = await Promise.all([
    Quest.countDocuments({ generatedByAi: true }),
    Quest.countDocuments({ generatedByAi: true, createdAt: { $gte: startOfMonth } }),
    Quest.countDocuments({ generatedByAi: true, createdAt: { $gte: startOfLastMonth, $lt: startOfMonth } }),
    Quest.countDocuments({ generatedByAi: true, status: 'completed' }),
    Quest.countDocuments({ generatedByAi: false, status: { $in: ['expired', 'abandoned'] } }),
    Quest.aggregate([
      { $match: { generatedByAi: true } },
      { $group: { _id: '$difficulty', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    // Evolution des quêtes IA sur les 7 derniers jours
    Quest.aggregate([
      { $match: { generatedByAi: true, createdAt: { $gte: new Date(Date.now() - 7 * 86400000) } } },
      {
        $group: {
          _id: { $dayOfMonth: '$createdAt' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id': 1 } },
    ]),
  ]);

  const totalStaticQuests = await Quest.countDocuments({ generatedByAi: false });
  const aiSuccessRate = totalAiQuests > 0
    ? Math.round((aiQuestsCompleted / totalAiQuests) * 100)
    : 0;
  const growthVsLastMonth = aiQuestsLastMonth > 0
    ? Math.round(((aiQuestsThisMonth - aiQuestsLastMonth) / aiQuestsLastMonth) * 100)
    : null;

  res.json({
    totalAiQuests,
    aiQuestsThisMonth,
    aiQuestsLastMonth,
    growthVsLastMonth,
    aiQuestsCompleted,
    aiQuestsFailed,
    aiSuccessRate,
    totalStaticQuests,
    aiRatio: totalAiQuests + totalStaticQuests > 0
      ? Math.round((totalAiQuests / (totalAiQuests + totalStaticQuests)) * 100)
      : 0,
    difficultyBreakdown: difficultyBreakdown.map(d => ({ name: d._id || 'Non défini', count: d.count })),
    dailyAiActivity,
  });
}));

// ─── Utilisateurs récents enrichis ────────────────────────────────────────────
router.get('/recent-users', asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 10, 50);

  const [recentUsers, totalUsers, activeThisMonth] = await Promise.all([
    User.find()
      .select('name email createdAt suspended pushToken isMerchant')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    User.countDocuments(),
    Transaction.distinct('userId', {
      createdAt: { $gte: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)) },
    }).then(ids => ids.length),
  ]);

  res.json({
    users: recentUsers.map(u => ({
      id: u._id,
      name: u.name,
      email: u.email,
      createdAt: u.createdAt,
      suspended: u.suspended ?? false,
      hasPushToken: !!u.pushToken,
      isMerchant: u.isMerchant ?? false,
    })),
    totalUsers,
    activeThisMonth,
  });
}));

module.exports = router;

