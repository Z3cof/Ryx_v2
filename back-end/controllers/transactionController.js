const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const { getExpectedCurrencyForUserId } = require('../utils/userCurrency');

function sendJson(res, status, data) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(data));
}

function parseBookingDate(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const parts = s.split('-').map((x) => parseInt(x, 10));
    const y = parts[0];
    const mo = parts[1];
    const d = parts[2];
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return new Date(Date.UTC(y, mo - 1, d, 12, 0, 0, 0));
  }
  const dt = new Date(s);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/**
 * Met à jour automatiquement la progression des quêtes actives de l'utilisateur
 * après chaque transaction.
 *
 * Quêtes mises à jour :
 *   - log_expenses  → currentValue = nb de transactions dans la fenêtre d'expiration
 *   - first_action  → currentValue = 1 (débloqué dès la 1ère transaction)
 *   - limit_category → currentValue = total dépensé dans la catégorie ce mois
 *   - save_amount   → currentValue = total des revenus (type 'in') ce mois
 */
async function _updateQuestProgress(userId) {
  // Import ici pour éviter la circularité au niveau module
  const Quest = require('../models/Quest');

  const activeQuests = await Quest.find({ userId, status: 'active' });
  if (activeQuests.length === 0) return;

  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  // Début de semaine lundi
  const dayOfWeek = now.getUTCDay(); // 0=dim, 1=lun ...
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const startOfWeek = new Date(now);
  startOfWeek.setUTCDate(now.getUTCDate() - daysToMonday);
  startOfWeek.setUTCHours(0, 0, 0, 0);

  for (const quest of activeQuests) {
    // Ignorer les quêtes expirées
    if (quest.expiresAt && quest.expiresAt < now) {
      quest.status = 'expired';
      await quest.save();
      continue;
    }

    let newValue = quest.currentValue;

    if (quest.type === 'log_expenses' || quest.type === 'first_action') {
      // Fenêtre de temps : cette semaine pour log_expenses, tout le temps pour first_action
      const since = quest.type === 'first_action' ? new Date(0) : startOfWeek;
      const count = await Transaction.countDocuments({
        userId,
        createdAt: { $gte: since },
      });
      newValue = count;
    }

    else if (quest.type === 'limit_category' && quest.targetCategory) {
      // Total dépensé dans la catégorie ce mois (valeurs négatives = dépenses)
      const agg = await Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            type: 'out',
            category: quest.targetCategory,
            createdAt: { $gte: startOfMonth },
          },
        },
        { $group: { _id: null, total: { $sum: { $abs: '$amount' } } } },
      ]);
      newValue = agg[0]?.total ?? 0;
    }

    else if (quest.type === 'save_amount') {
      // Total des revenus ce mois
      const agg = await Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            type: 'in',
            createdAt: { $gte: startOfMonth },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      newValue = agg[0]?.total ?? 0;
    }

    if (newValue !== quest.currentValue) {
      quest.currentValue = newValue;
      await quest.save();
    }
  }
}

/**
 * POST /api/transactions
 * Body: { userId, title, amount, currency?, category?, description?, type?, date? }
 * date: optionnel, ISO ou YYYY-MM-DD (jour de l’opération).
 * type: 'in' = entrée (revenus, va dans les économies), 'out' = dépense (défaut).
 */
async function createExpense(req, res) {
  const {
    userId,
    title,
    amount,
    currency: rawCurrency,
    category,
    description = '',
    type: txType = 'out',
    date: dateRaw,
  } = req.body;

  if (!userId || !title || amount == null || amount === '') {
    return sendJson(res, 400, { error: 'userId, title et amount sont requis.' });
  }

  const numAmount = Number(amount);
  if (Number.isNaN(numAmount) || numAmount <= 0) {
    return sendJson(res, 400, { error: 'amount doit être un nombre positif.' });
  }

  const oid = mongoose.Types.ObjectId.isValid(userId)
    ? new mongoose.Types.ObjectId(userId)
    : null;
  let currencyCode =
    typeof rawCurrency === 'string' && rawCurrency.trim()
      ? String(rawCurrency).trim().toUpperCase()
      : '';
  if (!currencyCode && oid) {
    currencyCode = await getExpectedCurrencyForUserId(oid);
  }
  if (!currencyCode) currencyCode = 'XOF';

  const isIncome = txType === 'in';
  const categoryVal = isIncome ? (String(category || 'Revenu').trim() || 'Revenu') : (String(category || 'Autre').trim() || 'Autre');

  const booking = parseBookingDate(dateRaw) || new Date();

  const doc = await Transaction.create({
    userId,
    title: String(title).trim(),
    description: String(description).trim(),
    amount: isIncome ? Math.abs(numAmount) : -Math.abs(numAmount),
    currency: currencyCode,
    type: isIncome ? 'in' : 'out',
    category: categoryVal,
    createdAt: booking,
    updatedAt: booking,
  });

  // Mise à jour automatique de la progression des quêtes actives (fire-and-forget)
  _updateQuestProgress(userId).catch(() => {});

  sendJson(res, 201, {
    id: doc._id.toString(),
    title: doc.title,
    amount: doc.amount,
    currency: doc.currency,
    category: doc.category,
    type: doc.type,
    createdAt: doc.createdAt,
  });
}

/**
 * PATCH /api/transactions/:transactionId
 * Body (partiel): { title?, amount?, category?, description?, currency?, date? }
 */
async function updateTransaction(req, res) {
  const { transactionId } = req.params;
  if (!transactionId || !mongoose.Types.ObjectId.isValid(transactionId)) {
    return sendJson(res, 400, { error: 'transactionId invalide.' });
  }
  const authUserId = req.authUserId;
  if (!authUserId || !mongoose.Types.ObjectId.isValid(authUserId)) {
    return sendJson(res, 401, { error: 'Session invalide.' });
  }
  const userOid = new mongoose.Types.ObjectId(authUserId);

  const doc = await Transaction.findOne({ _id: transactionId, userId: userOid });
  if (!doc) {
    return sendJson(res, 404, { error: 'Transaction introuvable.' });
  }

  const {
    title,
    amount,
    category,
    description,
    currency: rawCurrency,
    date: dateRaw,
  } = req.body || {};

  if (title != null) {
    const t = String(title).trim();
    if (!t) return sendJson(res, 400, { error: 'title invalide.' });
    doc.title = t;
  }
  if (amount != null && amount !== '') {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      return sendJson(res, 400, { error: 'amount doit être un nombre positif.' });
    }
    doc.amount = doc.type === 'in' ? Math.abs(n) : -Math.abs(n);
  }
  if (category != null) {
    const c = String(category).trim();
    doc.category = c || (doc.type === 'in' ? 'Revenu' : 'Autre');
  }
  if (description != null) {
    doc.description = String(description).trim();
  }
  if (rawCurrency != null) {
    const c = String(rawCurrency).trim().toUpperCase();
    if (c) doc.currency = c;
  }
  if (dateRaw != null && dateRaw !== '') {
    const booking = parseBookingDate(dateRaw);
    if (!booking) return sendJson(res, 400, { error: 'date invalide.' });
    doc.createdAt = booking;
  }

  await doc.save();

  sendJson(res, 200, {
    id: doc._id.toString(),
    title: doc.title,
    amount: doc.amount,
    currency: doc.currency,
    category: doc.category,
    type: doc.type,
    description: doc.description || '',
    createdAt: doc.createdAt,
  });
}

/**
 * DELETE /api/transactions/:transactionId
 */
async function deleteTransaction(req, res) {
  const { transactionId } = req.params;
  if (!transactionId || !mongoose.Types.ObjectId.isValid(transactionId)) {
    return sendJson(res, 400, { error: 'transactionId invalide.' });
  }
  const authUserId = req.authUserId;
  if (!authUserId || !mongoose.Types.ObjectId.isValid(authUserId)) {
    return sendJson(res, 401, { error: 'Session invalide.' });
  }
  const userOid = new mongoose.Types.ObjectId(authUserId);

  const result = await Transaction.deleteOne({ _id: transactionId, userId: userOid });
  if (result.deletedCount === 0) {
    return sendJson(res, 404, { error: 'Transaction introuvable.' });
  }
  sendJson(res, 200, { ok: true });
}

module.exports = { createExpense, updateTransaction, deleteTransaction };
