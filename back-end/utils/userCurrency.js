const { parsePhoneNumberFromString } = require('libphonenumber-js');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const { getCurrencyForCountryIso } = require('./countryCurrency');

/**
 * Pays ISO depuis téléphone E.164 puis champ profil (aligné sur le dashboard).
 */
function resolveCountryIsoFromUserDoc(user) {
  if (!user) return '';
  if (user.phoneE164) {
    const p = parsePhoneNumberFromString(user.phoneE164);
    if (p?.country) return String(p.country).toUpperCase().slice(0, 2);
  }
  const stored = (user.countryIso || '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(stored) ? stored : '';
}

/**
 * Devise d’affichage / métier pour un utilisateur : pays → mapping JSON, sinon 1er wallet, sinon XOF.
 */
async function getExpectedCurrencyForUserId(userId) {
  const user = await User.findById(userId).select('countryIso phoneE164').lean();
  const iso = resolveCountryIsoFromUserDoc(user);
  if (iso) return getCurrencyForCountryIso(iso);
  const w = await Wallet.findOne({ userId }).sort({ currency: 1 }).lean();
  const wc = w?.currency && String(w.currency).trim().toUpperCase();
  return wc || getCurrencyForCountryIso('');
}

function formatMoneyFr(amount, currencyCode) {
  const n = Math.round(Math.abs(Number(amount) || 0));
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${n.toLocaleString('fr-FR')} ${currencyCode}`;
  }
}

module.exports = {
  resolveCountryIsoFromUserDoc,
  getExpectedCurrencyForUserId,
  formatMoneyFr,
};
