const MonthlyBalance = require('../models/MonthlyBalance');
const mongoose = require('mongoose');
const { getExpectedCurrencyForUserId } = require('../utils/userCurrency');

async function getMonthlyBalance(req, res) {
  const userId = req.params.userId;
  const year = parseInt(req.query.year, 10);
  const month = parseInt(req.query.month, 10);

  if (!userId) return res.status(400).json({ error: 'userId requis.' });
  const objectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null;
  if (!objectId) return res.status(400).json({ error: 'userId invalide.' });

  const now = new Date();
  const y = Number.isNaN(year) ? now.getFullYear() : year;
  const m = Number.isNaN(month) ? now.getMonth() + 1 : month;
  if (m < 1 || m > 12) return res.status(400).json({ error: 'Mois invalide.' });

  const doc = await MonthlyBalance.findOne({ userId: objectId, year: y, month: m }).lean();
  const primaryCur = await getExpectedCurrencyForUserId(objectId);
  res.status(200).json({
    year: y,
    month: m,
    balance: doc != null ? doc.balance : null,
    currency: (doc?.currency && String(doc.currency).trim().toUpperCase()) || primaryCur,
  });
}

/**
 * PUT /api/balance/:userId
 * Body: { year, month, balance, currency? }
 * Définit le solde mensuel (affiché comme solde actuelle sur l'accueil).
 */
async function setMonthlyBalance(req, res) {
  const userId = req.params.userId;
  const { year, month, balance, currency: rawCurrency } = req.body;

  if (!userId) return res.status(400).json({ error: 'userId requis.' });
  const objectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null;
  if (!objectId) return res.status(400).json({ error: 'userId invalide.' });

  const defaultCur = await getExpectedCurrencyForUserId(objectId);
  const currency = String(rawCurrency || defaultCur).trim() || defaultCur;

  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  if (Number.isNaN(y) || Number.isNaN(m) || m < 1 || m > 12) {
    return res.status(400).json({ error: 'Année et mois invalides.' });
  }
  const numBalance = Number(balance);
  if (Number.isNaN(numBalance)) {
    return res.status(400).json({ error: 'Solde invalide.' });
  }

  const doc = await MonthlyBalance.findOneAndUpdate(
    { userId: objectId, year: y, month: m },
    { balance: numBalance, currency },
    { new: true, upsert: true }
  ).lean();

  res.status(200).json({ year: doc.year, month: doc.month, balance: doc.balance, currency: doc.currency });
}

module.exports = { getMonthlyBalance, setMonthlyBalance };
