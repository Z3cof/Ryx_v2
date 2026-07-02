const Quest = require('../models/Quest');
const UserProgress = require('../models/UserProgress');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');
const User = require('../models/User');


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

  const promises = activeQuests.map(async (quest) => {
    if (quest.expiresAt && quest.expiresAt < now) {
      quest.status = 'expired';
      await quest.save();
      return;
    }

    let newValue = quest.currentValue;

    if (quest.type === 'log_expenses' || quest.type === 'first_action') {
      const since = quest.type === 'first_action' ? new Date(0) : startOfWeek;
      const query = { userId, createdAt: { $gte: since } };
      if (quest.type === 'log_expenses') {
        query.type = 'out';
      }
      newValue = await Transaction.countDocuments(query);
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

    // Validation automatique + génération de nouvelles quêtes si objectif atteint
    const autoCompleteTypes = ['log_expenses', 'first_action', 'save_amount'];
    if (
      autoCompleteTypes.includes(quest.type) &&
      quest.status === 'active' &&
      quest.currentValue >= quest.targetValue
    ) {
      await _completeQuestCore(quest, userId);
    }
  });

  await Promise.all(promises);
}

/** Génère des quêtes IA si l'utilisateur a moins de 5 quêtes actives et n'est pas en cooldown. */
async function _maybeAutoGenerateQuests(userId) {
  const progress = await UserProgress.findOne({ userId });
  if (progress && progress.nextQuestGenerationAt && progress.nextQuestGenerationAt > new Date()) {
    return { generated: 0, quests: [], message: null };
  }

  const activeCount = await Quest.countDocuments({ userId, status: 'active' });
  if (activeCount >= 5) {
    return { generated: 0, quests: [], message: null };
  }
  return _generateQuestsForUser(userId);
}

/**
 * Marque une quête complétée, attribue l'XP, génère de nouvelles quêtes si besoin.
 * Retourne null si la quête n'était pas active.
 */
async function _completeQuestCore(quest, userId) {
  if (quest.status !== 'active') return null;

  quest.status = 'completed';
  quest.completedAt = new Date();
  quest.currentValue = Math.max(quest.currentValue, quest.targetValue);
  await quest.save();

  let progress = await UserProgress.findOne({ userId });
  if (!progress) {
    progress = await UserProgress.create({ userId });
  }

  progress.xp += quest.xpReward;
  progress.totalQuestsCompleted += 1;
  await _updateStreak(userId, progress);

  // Si l'utilisateur n'a plus aucune quête active après complétion, on déclenche le temps de recharge
  const activeCount = await Quest.countDocuments({ userId, status: 'active' });
  if (activeCount === 0) {
    const cooldownDays = 4 + Math.random() * 3; // Minimum 4 jours, maximum 7 jours
    progress.nextQuestGenerationAt = new Date(Date.now() + cooldownDays * 24 * 60 * 60 * 1000);
  }

  await progress.save();

  const level = progress.getLevel();
  const autoGenerated = await _maybeAutoGenerateQuests(userId);

  return {
    quest: quest.toObject(),
    xpEarned: quest.xpReward,
    progress: {
      xp: progress.xp,
      totalQuestsCompleted: progress.totalQuestsCompleted,
      streakDays: progress.streakDays,
      level,
      nextQuestGenerationAt: progress.nextQuestGenerationAt,
    },
    autoGenerated,
  };
}

/** Logique de génération (partagée entre POST /generate et complétion auto). */
async function _generateQuestsForUser(userId) {
  const activeCount = await Quest.countDocuments({ userId, status: 'active' });
  if (activeCount >= 5) {
    return {
      generated: 0,
      quests: [],
      message: 'Tu as déjà 5 quêtes actives. Complètes-en d\'abord avant d\'en générer de nouvelles.',
    };
  }

  // 1. Essai de génération avec le service IA (Gemini)
  const aiServiceUrl = (process.env.AI_SERVICE_URL || 'http://localhost:8082').replace(/\/$/, '');
  const aiSecret = process.env.RYX_AI_SERVICE_SECRET || '';

  try {
    const payload = {
      userId,
      locale: 'fr',
    };

    const headers = {
      'Content-Type': 'application/json',
    };
    if (aiSecret) {
      headers['X-Ryx-Ai-Secret'] = aiSecret;
    }

    const aiResponse = await fetch(`${aiServiceUrl}/api/quests/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (aiResponse.ok) {
      const data = await aiResponse.json();
      if (data && Array.isArray(data.quests) && data.quests.length > 0) {
        const questsToInsert = data.quests.map((q) => {
          const expiresDays = q.expiresDays || 7;
          return {
            userId,
            title: q.title,
            description: q.description,
            type: q.type || 'custom',
            targetCategory: q.targetCategory || null,
            targetValue: q.targetValue || 0,
            currentValue: 0,
            xpReward: q.xpReward || 50,
            difficulty: q.difficulty || 'medium',
            icon: q.icon || '⚡',
            generatedByAi: true,
            expiresAt: new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000),
          };
        });

        const maxToInsert = Math.max(0, 5 - activeCount);
        const slicedQuests = questsToInsert.slice(0, maxToInsert);

        if (slicedQuests.length > 0) {
          const created = await Quest.insertMany(slicedQuests);
          await _updateStreak(userId);
          const count = created.length;
          return {
            generated: count,
            quests: created.map((q) => q.toObject()),
            message: data.message || `Rixy a généré ${count} nouvelle${count > 1 ? 's' : ''} quête${count > 1 ? 's' : ''} pour toi ! ⚡`,
          };
        }
      }
    } else {
      const text = await aiResponse.text();
      console.warn(`[questController] Le service-ai a répondu avec le statut ${aiResponse.status} : ${text}. Repli vers le système statique.`);
    }
  } catch (error) {
    console.warn(`[questController] Erreur de communication avec le service-ai : ${error.message}. Repli vers le système statique.`);
  }

  // 2. Repli statique si l'IA a échoué ou est indisponible (Fallback)
  console.log('[questController] Lancement de la génération de secours (règles statiques)');
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

  const catTotals = {};
  for (const e of expenses) {
    catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
  }
  const topCategory = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];

  const newQuests = [];
  const expiry30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const expiry7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  if (totalExpenses > 0 && topCategory) {
    const [catName, catAmount] = topCategory;
    const target = Math.round(catAmount * 0.8);
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

  if (totalIncome > 0) {
    const savingsTarget = Math.round(totalIncome * 0.1);
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
    return { generated: 0, quests: [], message: 'Aucune nouvelle quête générée.' };
  }

  const created = await Quest.insertMany(toInsert);
  await _updateStreak(userId);

  const count = created.length;
  return {
    generated: count,
    quests: created.map((q) => q.toObject()),
    message: `Rixy a généré ${count} nouvelle${count > 1 ? 's' : ''} quête${count > 1 ? 's' : ''} pour toi ! ⚡`,
  };
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
    // Si un temps de recharge est en cours, on ne réinitialise rien, la liste reste vide
    if (progress.nextQuestGenerationAt && progress.nextQuestGenerationAt > new Date()) {
      activeQuests = [];
    } else {
      // Cooldown expiré ou absent : on nettoie la date et on génère
      if (progress.nextQuestGenerationAt) {
        progress.nextQuestGenerationAt = null;
        await progress.save();
      }

      // Si l'utilisateur a déjà complété des quêtes auparavant, on en génère des personnalisées
      const totalCompleted = await Quest.countDocuments({ userId, status: 'completed' });
      if (totalCompleted > 0) {
        const genResult = await _generateQuestsForUser(userId);
        activeQuests = genResult.quests || [];
      } else {
        // Premier accès de la toute première session : on propose les quêtes de départ
        const starters = STARTER_QUESTS.map((q) => ({ ...q, userId }));
        const created = await Quest.insertMany(starters);
        activeQuests = created;
      }
    }
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

  res.status(200).json({
    quests: activeQuests,
    recentCompleted,
    progress: {
      xp: progress.xp,
      totalQuestsCompleted: progress.totalQuestsCompleted,
      streakDays: progress.streakDays,
      bestStreak: progress.bestStreak,
      level,
      nextQuestGenerationAt: progress.nextQuestGenerationAt,
    },
  });
}

/**
 * POST /api/quests/:userId/generate
 * Génère de nouvelles quêtes personnalisées basées sur les données financières.
 */
async function generateQuests(req, res) {
  const userId = req.params.userId;
  
  // Vérification de la recharge
  const progress = await UserProgress.findOne({ userId });
  if (progress && progress.nextQuestGenerationAt && progress.nextQuestGenerationAt > new Date()) {
    const diffMs = progress.nextQuestGenerationAt - new Date();
    const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
    return res.status(400).json({
      error: `Rixy se repose ! De nouvelles quêtes seront disponibles dans ${diffDays} jour${diffDays > 1 ? 's' : ''}.`,
      nextQuestGenerationAt: progress.nextQuestGenerationAt,
    });
  }

  // Si la recharge est expirée, on la remet à zéro
  if (progress && progress.nextQuestGenerationAt) {
    progress.nextQuestGenerationAt = null;
    await progress.save();
  }

  const result = await _generateQuestsForUser(userId);
  res.status(200).json(result);
}

/**
 * PATCH /api/quests/:userId/:questId/complete
 * Marque une quête comme complétée et attribue l'XP.
 */
async function completeQuest(req, res) {
  const { userId, questId } = req.params;

  const quest = await Quest.findOne({ _id: questId, userId, status: 'active' });
  if (!quest) {
    return res.status(404).json({ error: 'Quête introuvable ou déjà terminée.' });
  }

  const result = await _completeQuestCore(quest, userId);
  if (!result) {
    return res.status(404).json({ error: 'Quête introuvable ou déjà terminée.' });
  }

  res.status(200).json({
    ...result,
    message: `Quête complétée ! +${result.xpEarned} XP 🎉`,
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

  res.status(200).json({
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
