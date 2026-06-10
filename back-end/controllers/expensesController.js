/**
 * Contrôleur dépenses : résumé, liste par mois, seuil mensuel (pour IA).
 * Stockage : Transaction + MonthlyBudget (seuil à ne pas dépasser).
 */
const Transaction = require('../models/Transaction');
const MonthlyBudget = require('../models/MonthlyBudget');
const mongoose = require('mongoose');
const { getExpectedCurrencyForUserId, formatMoneyFr } = require('../utils/userCurrency');
const { ensureRecurringForUserMonth } = require('../services/recurringEnsure');

function sendJson(res, status, data) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(data));
}

const MONTH_NAMES = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

/**
 * GET /api/expenses/summary/:userId
 * Retourne totaux du mois, de l'année et détail par mois (12 derniers mois).
 * Stockage : modèle Transaction uniquement.
 */
async function getSummary(req, res) {
  const userId = req.params.userId;
  if (!userId) {
    return sendJson(res, 400, { error: 'userId requis.' });
  }

  const objectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null;
  if (!objectId) {
    return sendJson(res, 400, { error: 'userId invalide.' });
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  // 3 ans en arrière pour voir années et mois précédents
  const threeYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), 1);

  const [currentMonthTotal, currentYearTotal, monthlyBreakdown] = await Promise.all([
    Transaction.aggregate([
      { $match: { userId: objectId, type: 'out' } },
      { $match: { createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: { $abs: '$amount' } } } },
      { $project: { total: { $ifNull: ['$total', 0] } } },
    ]).then((r) => (r[0] && r[0].total != null ? r[0].total : 0)),
    Transaction.aggregate([
      { $match: { userId: objectId, type: 'out' } },
      { $match: { createdAt: { $gte: startOfYear } } },
      { $group: { _id: null, total: { $sum: { $abs: '$amount' } } } },
      { $project: { total: { $ifNull: ['$total', 0] } } },
    ]).then((r) => (r[0] && r[0].total != null ? r[0].total : 0)),
    Transaction.aggregate([
      { $match: { userId: objectId, type: 'out' } },
      { $match: { createdAt: { $gte: threeYearsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          total: { $sum: { $abs: '$amount' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 36 },
    ]),
  ]);

  const byMonth = (monthlyBreakdown || []).map((m) => ({
    year: m._id.year,
    month: m._id.month,
    monthLabel: `${MONTH_NAMES[m._id.month - 1]} ${m._id.year}`,
    total: m.total || 0,
    count: m.count || 0,
  }));

  sendJson(res, 200, {
    currentMonthTotal: currentMonthTotal ?? 0,
    currentYearTotal: currentYearTotal ?? 0,
    monthlyBreakdown: byMonth,
  });
}

/**
 * GET /api/expenses/income/:userId?year=2025&month=3
 * Retourne la liste des entrées (revenus) du mois (type 'in').
 */
async function getIncomeByMonth(req, res) {
  const userId = req.params.userId;
  const year = parseInt(req.query.year, 10);
  const month = parseInt(req.query.month, 10);

  if (!userId) {
    return sendJson(res, 400, { error: 'userId requis.' });
  }

  const objectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null;
  if (!objectId) {
    return sendJson(res, 400, { error: 'userId invalide.' });
  }

  const y = Number.isNaN(year) ? new Date().getFullYear() : year;
  const m = Number.isNaN(month) ? new Date().getMonth() + 1 : month;
  try {
    await ensureRecurringForUserMonth(objectId, y, m);
  } catch (e) {
    console.error('[expenses] ensure recurring (income)', e?.message || e);
  }
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0, 23, 59, 59, 999);

  const transactions = await Transaction.find({
    userId: objectId,
    type: 'in',
    createdAt: { $gte: start, $lte: end },
  })
    .sort({ createdAt: -1 })
    .lean();

  const primaryCur = await getExpectedCurrencyForUserId(objectId);
  const formatTx = (t) => {
    const cur =
      (t.currency && String(t.currency).trim().toUpperCase()) || primaryCur;
    const amountNum = Math.abs(Number(t.amount) || 0);
    const createdIso = t.createdAt ? new Date(t.createdAt).toISOString() : null;
    return {
      id: t._id.toString(),
      title: t.title,
      desc: t.description,
      amount: formatMoneyFr(t.amount, cur),
      amountValue: amountNum,
      currency: cur,
      createdAtIso: createdIso,
      date: t.createdAt
        ? new Date(t.createdAt).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : '',
      type: 'in',
      category: t.category || 'Revenu',
    };
  };

  sendJson(res, 200, {
    year: y,
    month: m,
    monthLabel: `${MONTH_NAMES[m - 1]} ${y}`,
    income: transactions.map(formatTx),
    total: transactions.reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0),
  });
}

/**
 * GET /api/expenses/:userId?year=2025&month=3
 * Retourne la liste des dépenses du mois (type 'out'). Modèle Transaction.
 */
async function getByMonth(req, res) {
  const userId = req.params.userId;
  const year = parseInt(req.query.year, 10);
  const month = parseInt(req.query.month, 10);

  if (!userId) {
    return sendJson(res, 400, { error: 'userId requis.' });
  }

  const objectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null;
  if (!objectId) {
    return sendJson(res, 400, { error: 'userId invalide.' });
  }

  const y = Number.isNaN(year) ? new Date().getFullYear() : year;
  const m = Number.isNaN(month) ? new Date().getMonth() + 1 : month;
  try {
    await ensureRecurringForUserMonth(objectId, y, m);
  } catch (e) {
    console.error('[expenses] ensure recurring (out)', e?.message || e);
  }
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0, 23, 59, 59, 999);

  const transactions = await Transaction.find({
    userId: objectId,
    type: 'out',
    createdAt: { $gte: start, $lte: end },
  })
    .sort({ createdAt: -1 })
    .lean();

  const primaryCur = await getExpectedCurrencyForUserId(objectId);
  const formatTx = (t) => {
    const cur =
      (t.currency && String(t.currency).trim().toUpperCase()) || primaryCur;
    const amountNum = Math.abs(Number(t.amount) || 0);
    const createdIso = t.createdAt ? new Date(t.createdAt).toISOString() : null;
    return {
      id: t._id.toString(),
      title: t.title,
      desc: t.description,
      amount: formatMoneyFr(t.amount, cur),
      amountValue: amountNum,
      currency: cur,
      createdAtIso: createdIso,
      date: t.createdAt
        ? new Date(t.createdAt).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : '',
      type: 'out',
      category: t.category || 'Autre',
    };
  };

  sendJson(res, 200, {
    year: y,
    month: m,
    monthLabel: `${MONTH_NAMES[m - 1]} ${y}`,
    expenses: transactions.map(formatTx),
    total: transactions.reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0),
  });
}

/**
 * GET /api/expenses/threshold/:userId?year=2025&month=3
 * Récupère le seuil de dépenses du mois (à ne pas dépasser). Données pour le modèle IA.
 */
async function getThreshold(req, res) {
  const userId = req.params.userId;
  const year = parseInt(req.query.year, 10);
  const month = parseInt(req.query.month, 10);

  if (!userId) return sendJson(res, 400, { error: 'userId requis.' });
  const objectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null;
  if (!objectId) return sendJson(res, 400, { error: 'userId invalide.' });

  const y = Number.isNaN(year) ? new Date().getFullYear() : year;
  const m = Number.isNaN(month) ? new Date().getMonth() + 1 : month;
  if (m < 1 || m > 12) return sendJson(res, 400, { error: 'Mois invalide.' });

  const doc = await MonthlyBudget.findOne({ userId: objectId, year: y, month: m }).lean();
  const primaryCur = await getExpectedCurrencyForUserId(objectId);
  sendJson(res, 200, {
    year: y,
    month: m,
    amount: doc ? doc.amount : null,
    currency: (doc?.currency && String(doc.currency).trim().toUpperCase()) || primaryCur,
  });
}

/**
 * PUT /api/expenses/threshold/:userId
 * Body: { year, month, amount, currency? }
 * Définit le seuil du mois (à ne pas dépasser). Données pour le modèle IA.
 */
async function setThreshold(req, res) {
  const userId = req.params.userId;
  const { year, month, amount, currency: rawCurrency } = req.body;

  if (!userId) return sendJson(res, 400, { error: 'userId requis.' });
  const objectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null;
  if (!objectId) return sendJson(res, 400, { error: 'userId invalide.' });

  const defaultCur = await getExpectedCurrencyForUserId(objectId);
  const currency = String(rawCurrency || defaultCur).trim() || defaultCur;

  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  if (Number.isNaN(y) || Number.isNaN(m) || m < 1 || m > 12) {
    return sendJson(res, 400, { error: 'Année et mois invalides.' });
  }
  const numAmount = Number(amount);
  if (Number.isNaN(numAmount) || numAmount < 0) {
    return sendJson(res, 400, { error: 'Montant invalide (nombre >= 0).' });
  }

  const doc = await MonthlyBudget.findOneAndUpdate(
    { userId: objectId, year: y, month: m },
    { amount: numAmount, currency },
    { new: true, upsert: true }
  ).lean();

  sendJson(res, 200, { year: doc.year, month: doc.month, amount: doc.amount, currency: doc.currency });
}

module.exports = { getSummary, getByMonth, getIncomeByMonth, getThreshold, setThreshold };
