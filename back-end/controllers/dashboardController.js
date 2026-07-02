const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const MonthlyBalance = require('../models/MonthlyBalance');
const MonthlyBudget = require('../models/MonthlyBudget');
const RecurringRule = require('../models/RecurringRule');
const { getCurrencyForCountryIso } = require('../utils/countryCurrency');
const { resolveCountryIsoFromUserDoc } = require('../utils/userCurrency');
const { ensureRecurringForUserMonth } = require('../services/recurringEnsure');


/**
 * GET /api/dashboard/:userId
 * Accueil : user, portefeuilles, totaux et flux du mois civil en cours (même fenêtre que GET /api/expenses/:userId pour ce mois).
 */
async function getDashboard(req, res) {
  const { userId } = req.params;
  if (!userId) {
    return res.status(400).json({ error: 'userId requis.' });
  }

  const user = await User.findById(userId)
    .select('name email isMerchant avatar countryIso phoneE164')
    .lean();
  if (!user) {
    return res.status(404).json({ error: 'Utilisateur introuvable.' });
  }

  const resolvedIso = resolveCountryIsoFromUserDoc(user);
  const expectedCurrency = getCurrencyForCountryIso(resolvedIso || '');

  if (resolvedIso && (user.countryIso || '').trim().toUpperCase() !== resolvedIso) {
    await User.updateOne({ _id: user._id }, { $set: { countryIso: resolvedIso } });
    user.countryIso = resolvedIso;
  }

  const walletUserRef = user._id;
  let wallets = await Wallet.find({ userId: walletUserRef }).sort({ currency: 1 }).lean();
  if (wallets.length === 0) {
    await Wallet.create({ userId: walletUserRef, currency: expectedCurrency, balance: 0 });
    wallets = await Wallet.find({ userId: walletUserRef }).sort({ currency: 1 }).lean();
  } else if (
    wallets.length === 1 &&
    resolvedIso &&
    wallets[0].currency !== expectedCurrency
  ) {
    /** Aligne la devise du portefeuille sur le pays du numéro (ex. +243 → CDF), même si solde ≠ 0. */
    await Wallet.updateOne({ _id: wallets[0]._id }, { $set: { currency: expectedCurrency } });
    wallets = await Wallet.find({ userId: walletUserRef }).sort({ currency: 1 }).lean();
  }

  /** Anciens docs créés avec défaut Mongoose XOF : aligner sur la devise pays (CDF, EUR, etc.). */
  if (resolvedIso && expectedCurrency && expectedCurrency !== 'XOF') {
    await Promise.all([
      MonthlyBalance.updateMany(
        { userId: walletUserRef, currency: 'XOF' },
        { $set: { currency: expectedCurrency } }
      ),
      MonthlyBudget.updateMany(
        { userId: walletUserRef, currency: 'XOF' },
        { $set: { currency: expectedCurrency } }
      ),
      Transaction.updateMany(
        { userId: walletUserRef, currency: 'XOF' },
        { $set: { currency: expectedCurrency } }
      ),
      RecurringRule.updateMany(
        { userId: walletUserRef, currency: 'XOF' },
        { $set: { currency: expectedCurrency } }
      ),
    ]);
  }

  const totalBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);
  /** Ne pas se fier seul au 1er wallet (défaut Mongoose = XOF) : si le pays est connu via +243, la devise affichée suit. */
  let primaryCurrency = wallets[0]?.currency || 'XOF';
  if (resolvedIso) {
    primaryCurrency = expectedCurrency;
  }

  const countryIsoForResponse = resolvedIso || (user.countryIso || '').trim().toUpperCase();
  const countryIsoJson =
    countryIsoForResponse.length === 2 && /^[A-Z]{2}$/.test(countryIsoForResponse)
      ? countryIsoForResponse
      : null;

  const userObjectId = user._id;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  /** Même plage que GET /api/expenses/:userId (mois civil, fuseau du serveur Node). */
  const monthStart = new Date(currentYear, currentMonth - 1, 1);
  const monthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

  try {
    await ensureRecurringForUserMonth(userObjectId, currentYear, currentMonth);
  } catch (e) {
    console.error('[dashboard] ensure recurring', e?.message || e);
  }

  const [outTxsMonth, inTxsMonth, currentMonthExpensesAgg, currentMonthRevenusAgg] = await Promise.all([
    Transaction.find({
      userId: userObjectId,
      type: 'out',
      createdAt: { $gte: monthStart, $lte: monthEnd },
    })
      .sort({ createdAt: -1 })
      .limit(80)
      .lean(),
    Transaction.find({
      userId: userObjectId,
      type: 'in',
      createdAt: { $gte: monthStart, $lte: monthEnd },
    })
      .sort({ createdAt: -1 })
      .limit(80)
      .lean(),
    Transaction.aggregate([
      {
        $match: {
          userId: userObjectId,
          type: 'out',
          createdAt: { $gte: monthStart, $lte: monthEnd },
        },
      },
      { $group: { _id: null, total: { $sum: { $abs: '$amount' } } } },
    ]),
    Transaction.aggregate([
      {
        $match: {
          userId: userObjectId,
          type: 'in',
          createdAt: { $gte: monthStart, $lte: monthEnd },
        },
      },
      { $group: { _id: null, total: { $sum: { $abs: '$amount' } } } },
    ]),
  ]);

  const currentMonthExpenses = currentMonthExpensesAgg[0]?.total ?? 0;
  const currentMonthRevenus = currentMonthRevenusAgg[0]?.total ?? 0;
  /** Totaux affichés sur l’accueil = mois en cours (aligné écran Dépenses pour ce mois). */
  const totalRevenus = currentMonthRevenus;
  const totalDepenses = currentMonthExpenses;
  const soldeDisponible = currentMonthRevenus - currentMonthExpenses;

  const seenIds = new Set();
  const mergedForFeed = [];
  const pushUnique = (arr) => {
    for (const t of arr) {
      const id = t._id.toString();
      if (!seenIds.has(id)) {
        seenIds.add(id);
        mergedForFeed.push(t);
      }
    }
  };
  pushUnique(outTxsMonth);
  pushUnique(inTxsMonth);
  mergedForFeed.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const transactionsRaw = mergedForFeed.slice(0, 60);

  const expensesForChart = transactionsRaw
    .filter((t) => t.type === 'out')
    .slice(0, 12)
    .map((t) => ({
      id: t._id.toString(),
      title: t.title,
      amount: Math.abs(Number(t.amount) || 0),
      date: t.createdAt,
    }));

  const formatTxAmount = (n) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: primaryCurrency,
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(Math.round(Math.abs(Number(n) || 0)));

  const formatTx = (t) => ({
    id: t._id.toString(),
    title: t.title,
    desc: t.description,
    amount: formatTxAmount(t.amount),
    date: t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
    type: t.type,
    category: t.category || 'Autre',
  });

  res.status(200).json({
    user: {
      name: user.name,
      email: user.email,
      isMerchant: !!user.isMerchant,
      ...(user.avatar ? { avatar: user.avatar } : {}),
      ...(countryIsoJson ? { countryIso: countryIsoJson } : {}),
    },
    balance: totalBalance,
    currency: primaryCurrency,
    totalRevenus,
    totalDepenses,
    soldeDisponible,
    currentMonthExpenses,
    wallets: wallets.map((w) => ({ currency: w.currency, balance: w.balance })),
    transactions: transactionsRaw.map(formatTx),
    expensesForChart,
  });
}

module.exports = { getDashboard };
