const Quest = require('../models/Quest');
const UserProgress = require('../models/UserProgress');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');
const User = require('../models/User');

function sendJson(res, status, data) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(data));
}

/** Quêtes de départ statiques (affichées avant que Rixy génère les personnalisées) */
const STARTER_QUESTS = [
  {
    title: 'Premier pas ⚡',
    description: 'Enregistre ta première dépense dans Ryx. Chaque grand voyage commence par un premier pas !',
    type: 'first_action',
    targetValue: 1,
    xpReward: 30,
    difficulty: 'easy',
    icon: '👣',
    generatedByAi: false,
  },
  {
    title: 'Explorateur de budget',
    description: 'Consulte ton tableau de bord d\'accueil et découvre ton solde du mois.',
    type: 'first_action',
    targetValue: 1,
    xpReward: 20,
    difficulty: 'easy',
    icon: '🗺️',
    generatedByAi: false,
  },
  {
    title: 'Gardien de l\'épargne',
    description: 'Enregistre 3 dépenses cette semaine pour garder le contrôle de tes finances.',
    type: 'log_expenses',
    targetValue: 3,
    xpReward: 50,
    difficulty: 'easy',
    icon: '🛡️',
    generatedByAi: false,
    expiresAt: (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d; })(),
  },
];

/**
 * Re-synchronise currentValue de toutes les quêtes actives d'un utilisateur
 * en fonction de ses transactions réelles. Appelée à chaque GET /api/quests/:userId.
 */
async function _syncQuestProgress(userId) {
  const activeQuests = await Quest.find({ userId, status: 'active' });
  if (activeQuests.length === 0) return;

  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  // Semaine débutant le lundi
  const dayOfWeek = now.getUTCDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const startOfWeek = new Date(now);
  startOfWeek.setUTCDate(now.getUTCDate() - daysToMonday);
  startOfWeek.setUTCHours(0, 0, 0, 0);

  const userOid = mongoose.Types.ObjectId.isValid(userId)
    ? new mongoose.Types.ObjectId(userId)
    : null;

  for (const quest of activeQuests) {
    if (quest.expiresAt && quest.expiresAt < now) {
      quest.status = 'expired';
      await quest.save();
      continue;
    }

    let newValue = quest.currentValue;

    if (quest.type === 'log_expenses' || quest.type === 'first_action') {
      const since = quest.type === 'first_action' ? new Date(0) : startOfWeek;
      newValue = await Transaction.countDocuments({ userId, createdAt: { $gte: since } });
    }
    else if (quest.type === 'limit_category' && quest.targetCategory) {
      if (userOid) {
        const agg = await Transaction.aggregate([
          { $match: { userId: userOid, type: 'out', category: quest.targetCategory, createdAt: { $gte: startOfMonth } } },
          { $group: { _id: null, total: { $sum: { $abs: '$amount' } } } },
        ]);
        newValue = agg[0]?.total ?? 0;
      }
    }
    else if (quest.type === 'save_amount') {
      if (userOid) {
        const agg = await Transaction.aggregate([
          { $match: { userId: userOid, type: 'in', createdAt: { $gte: startOfMonth } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);
        newValue = agg[0]?.total ?? 0;
      }
    }

    if (newValue !== quest.currentValue) {
      quest.currentValue = newValue;
      await quest.save();
    }
  }
}

/**
 * GET /api/quests/:userId
 * Retourne les quêtes actives + la progression de l'utilisateur.
 */
async function listQuests(req, res) {
  const userId = req.params.userId;

  // Récupère ou initialise la progression
  let progress = await UserProgress.findOne({ userId });
  if (!progress) {
    progress = await UserProgress.create({ userId });
  }

  // Quêtes actives — initialiser si besoin
  let activeQuests = await Quest.find({ userId, status: 'active' }).sort({ createdAt: -1 });

  if (activeQuests.length === 0) {
    const starters = STARTER_QUESTS.map((q) => ({ ...q, userId }));
    const created = await Quest.insertMany(starters);
    activeQuests = created;
  }

  // Synchroniser la progression en temps réel
  await _syncQuestProgress(userId);

  // Recharger après sync pour avoir les valeurs à jour
  activeQuests = await Quest.find({ userId, status: 'active' }).sort({ createdAt: -1 }).lean();

  // Quêtes récemment complétées (7 derniers jours)
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentCompleted = await Quest.find({
    userId,
    status: 'completed',
    completedAt: { $gte: since },
  }).sort({ completedAt: -1 }).limit(10).lean();

  const level = progress.getLevel();

  sendJson(res, 200, {
    quests: activeQuests,
    recentCompleted,
    progress: {
      xp: progress.xp,
      totalQuestsCompleted: progress.totalQuestsCompleted,
      streakDays: progress.streakDays,
      bestStreak: progress.bestStreak,
      level,
    },
  });
}

/**
 * POST /api/quests/:userId/generate
 * Génère de nouvelles quêtes personnalisées basées sur les données financières.
 */
async function generateQuests(req, res) {
  const userId = req.params.userId;

  // Vérifier combien de quêtes actives il a déjà
  const activeCount = await Quest.countDocuments({ userId, status: 'active' });
  if (activeCount >= 5) {
    return sendJson(res, 200, {
      generated: 0,
      message: 'Tu as déjà 5 quêtes actives. Complètes-en d\'abord avant d\'en générer de nouvelles.',
    });
  }

  // Analyser les données financières pour personnaliser
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const transactions = await Transaction.find({
    userId,
    createdAt: { $gte: startOfMonth },
  }).lean();

  const expenses = transactions.filter((t) => t.type === 'out');
  const incomes = transactions.filter((t) => t.type === 'in');
  const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);
  const totalIncome = incomes.reduce((s, t) => s + t.amount, 0);

  // Calcul de la catégorie la plus dépensée
  const catTotals = {};
  for (const e of expenses) {
    catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
  }
  const topCategory = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];

  const newQuests = [];
  const expiry30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const expiry7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Quête 1 : basée sur les dépenses du mois
  if (totalExpenses > 0 && topCategory) {
    const [catName, catAmount] = topCategory;
    const target = Math.round(catAmount * 0.8); // réduire de 20%
    newQuests.push({
      userId,
      title: `Maîtrise de ${catName}`,
      description: `Tu as dépensé ${catAmount.toLocaleString('fr-FR')} FCFA en ${catName} ce mois. Essaie de rester sous ${target.toLocaleString('fr-FR')} FCFA la prochaine fois. Rixy te fait confiance ! 💪`,
      type: 'limit_category',
      targetCategory: catName,
      targetValue: target,
      currentValue: catAmount,
      xpReward: 100,
      difficulty: 'medium',
      icon: '🎯',
      generatedByAi: true,
      expiresAt: expiry30,
    });
  }

  // Quête 2 : basée sur l'épargne
  if (totalIncome > 0) {
    const savingsTarget = Math.round(totalIncome * 0.1); // 10% du revenu
    newQuests.push({
      userId,
      title: 'Défi Épargne 10%',
      description: `Épargne l'équivalent de 10% de tes revenus ce mois-ci, soit ${savingsTarget.toLocaleString('fr-FR')} FCFA. Une petite économie régulière crée de grandes richesses ! 🌱`,
      type: 'save_amount',
      targetValue: savingsTarget,
      currentValue: 0,
      xpReward: 150,
      difficulty: 'medium',
      icon: '💰',
      generatedByAi: true,
      expiresAt: expiry30,
    });
  }

  // Quête 3 : log régulier des dépenses
  const logsThisWeek = transactions.filter((t) => {
    const d = new Date(t.createdAt);
    const daysSince = (now - d) / (1000 * 60 * 60 * 24);
    return daysSince <= 7;
  }).length;

  if (logsThisWeek < 5) {
    newQuests.push({
      userId,
      title: 'Comptable de la semaine',
      description: 'Enregistre 5 transactions cette semaine pour garder une vue claire de tes finances. La connaissance, c\'est le pouvoir ! 📊',
      type: 'log_expenses',
      targetValue: 5,
      currentValue: logsThisWeek,
      xpReward: 80,
      difficulty: 'easy',
      icon: '📝',
      generatedByAi: true,
      expiresAt: expiry7,
    });
  }

  // Quête 4 : si peu de données, quête universelle
  if (newQuests.length === 0) {
    newQuests.push({
      userId,
      title: 'Bâtisseur de richesse',
      description: 'Commence à enregistrer tes finances régulièrement. Rixy analysera bientôt tes données pour te créer des défis ultra-personnalisés ! 🔮',
      type: 'log_expenses',
      targetValue: 7,
      currentValue: transactions.length,
      xpReward: 60,
      difficulty: 'easy',
      icon: '🏗️',
      generatedByAi: true,
      expiresAt: expiry7,
    });
  }

  const toInsert = newQuests.slice(0, Math.max(0, 5 - activeCount));
  if (toInsert.length === 0) {
    return sendJson(res, 200, { generated: 0, message: 'Aucune nouvelle quête générée.' });
  }

  const created = await Quest.insertMany(toInsert);

  // Mettre à jour le streak
  await _updateStreak(userId);

  sendJson(res, 200, {
    generated: created.length,
    quests: created.map((q) => q.toObject()),
    message: `Rixy a généré ${created.length} nouvelle${created.length > 1 ? 's' : ''} quête${created.length > 1 ? 's' : ''} pour toi ! ⚡`,
  });
}

/**
 * PATCH /api/quests/:userId/:questId/complete
 * Marque une quête comme complétée et attribue l'XP.
 */
async function completeQuest(req, res) {
  const { userId, questId } = req.params;

  const quest = await Quest.findOne({ _id: questId, userId, status: 'active' });
  if (!quest) {
    return sendJson(res, 404, { error: 'Quête introuvable ou déjà terminée.' });
  }

  // Compléter la quête
  quest.status = 'completed';
  quest.completedAt = new Date();
  quest.currentValue = quest.targetValue;
  await quest.save();

  // Attribuer l'XP
  let progress = await UserProgress.findOne({ userId });
  if (!progress) {
    progress = await UserProgress.create({ userId });
  }

  progress.xp += quest.xpReward;
  progress.totalQuestsCompleted += 1;
  await _updateStreak(userId, progress);
  await progress.save();

  const level = progress.getLevel();

  sendJson(res, 200, {
    quest: quest.toObject(),
    xpEarned: quest.xpReward,
    progress: {
      xp: progress.xp,
      totalQuestsCompleted: progress.totalQuestsCompleted,
      streakDays: progress.streakDays,
      level,
    },
    message: `Quête complétée ! +${quest.xpReward} XP 🎉`,
  });
}

/**
 * GET /api/quests/:userId/progress
 * Retourne uniquement la progression (XP, niveau, streak).
 */
async function getProgress(req, res) {
  const { userId } = req.params;

  let progress = await UserProgress.findOne({ userId });
  if (!progress) {
    progress = await UserProgress.create({ userId });
  }

  await _updateStreak(userId, progress);
  await progress.save();

  const level = progress.getLevel();

  sendJson(res, 200, {
    xp: progress.xp,
    totalQuestsCompleted: progress.totalQuestsCompleted,
    streakDays: progress.streakDays,
    bestStreak: progress.bestStreak,
    level,
  });
}

/** Met à jour le streak basé sur la date d'aujourd'hui. */
async function _updateStreak(userId, progress) {
  const doc = progress ?? (await UserProgress.findOne({ userId }));
  if (!doc) return;

  const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
  if (doc.lastActiveDate === today) return; // déjà compté aujourd'hui

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (doc.lastActiveDate === yesterday) {
    doc.streakDays += 1;
  } else {
    doc.streakDays = 1; // reset
  }
  doc.bestStreak = Math.max(doc.bestStreak, doc.streakDays);
  doc.lastActiveDate = today;

  if (!progress) await doc.save();
}

module.exports = { listQuests, generateQuests, completeQuest, getProgress };
