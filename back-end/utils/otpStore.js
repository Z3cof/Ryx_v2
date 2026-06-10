/** Stockage mémoire OTP + jetons d’inscription (redémarrage serveur = invalide). */

const crypto = require('crypto');

/** @type {Map<string, { code: string, expires: number }>} */
const otpByPhone = new Map();

/** @type {Map<string, { code: string, expires: number }>} */
const otpByEmail = new Map();

/** @type {Map<string, { phoneE164: string, expires: number }>} */
const registerTokens = new Map();

/** @type {Map<string, { email: string, expires: number }>} */
const resetTokens = new Map();

/** @type {Map<string, { phoneE164: string, expires: number }>} */
const resetTokensByPhone = new Map();

/** @type {Map<string, number>} dernier envoi par numéro (ms) */
const lastSendAt = new Map();

/** @type {Map<string, number>} dernier envoi par e-mail (ms) */
const lastSendAtByEmail = new Map();

const OTP_TTL_MS = 5 * 60 * 1000;
const REGISTER_TOKEN_TTL_MS = 15 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

function now() {
  return Date.now();
}

function setOtp(phoneE164, code) {
  otpByPhone.set(phoneE164, { code: String(code), expires: now() + OTP_TTL_MS });
}

/**
 * @returns {boolean} true si le code correspond et consomme l’OTP
 */
function verifyAndConsumeOtp(phoneE164, inputCode) {
  const row = otpByPhone.get(phoneE164);
  if (!row || now() > row.expires) {
    otpByPhone.delete(phoneE164);
    return false;
  }
  if (row.code !== String(inputCode).trim()) {
    return false;
  }
  otpByPhone.delete(phoneE164);
  return true;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function setEmailOtp(email, code) {
  const key = normalizeEmail(email);
  otpByEmail.set(key, { code: String(code), expires: now() + OTP_TTL_MS });
}

function verifyAndConsumeEmailOtp(email, inputCode) {
  const key = normalizeEmail(email);
  const row = otpByEmail.get(key);
  if (!row || now() > row.expires) {
    otpByEmail.delete(key);
    return false;
  }
  if (row.code !== String(inputCode).trim()) {
    return false;
  }
  otpByEmail.delete(key);
  return true;
}

function canResendEmail(email) {
  const key = normalizeEmail(email);
  const t = lastSendAtByEmail.get(key) || 0;
  return now() - t >= RESEND_COOLDOWN_MS;
}

function markEmailSent(email) {
  lastSendAtByEmail.set(normalizeEmail(email), now());
}

function issueResetTokenByPhone(phoneE164) {
  const token = crypto.randomBytes(32).toString('hex');
  resetTokensByPhone.set(token, { phoneE164, expires: now() + RESET_TOKEN_TTL_MS });
  return token;
}

function consumeResetTokenByPhone(token, phoneE164) {
  const row = resetTokensByPhone.get(token);
  if (!row || row.phoneE164 !== phoneE164 || now() > row.expires) {
    if (token) resetTokensByPhone.delete(token);
    return false;
  }
  resetTokensByPhone.delete(token);
  return true;
}

function issueResetToken(email) {
  const token = crypto.randomBytes(32).toString('hex');
  resetTokens.set(token, { email: normalizeEmail(email), expires: now() + RESET_TOKEN_TTL_MS });
  return token;
}

function consumeResetToken(token, email) {
  const row = resetTokens.get(token);
  const key = normalizeEmail(email);
  if (!row || row.email !== key || now() > row.expires) {
    if (token) resetTokens.delete(token);
    return false;
  }
  resetTokens.delete(token);
  return true;
}

function issueRegisterToken(phoneE164) {
  const token = crypto.randomBytes(32).toString('hex');
  registerTokens.set(token, { phoneE164, expires: now() + REGISTER_TOKEN_TTL_MS });
  return token;
}

/**
 * @returns {boolean} true si jeton valide pour ce numéro (consommé)
 */
function consumeRegisterToken(token, phoneE164) {
  const row = registerTokens.get(token);
  if (!row || row.phoneE164 !== phoneE164 || now() > row.expires) {
    if (token) registerTokens.delete(token);
    return false;
  }
  registerTokens.delete(token);
  return true;
}

function canResend(phoneE164) {
  const t = lastSendAt.get(phoneE164) || 0;
  return now() - t >= RESEND_COOLDOWN_MS;
}

function markSent(phoneE164) {
  lastSendAt.set(phoneE164, now());
}

module.exports = {
  setOtp,
  verifyAndConsumeOtp,
  setEmailOtp,
  verifyAndConsumeEmailOtp,
  issueRegisterToken,
  consumeRegisterToken,
  issueResetToken,
  consumeResetToken,
  issueResetTokenByPhone,
  consumeResetTokenByPhone,
  canResend,
  markSent,
  canResendEmail,
  markEmailSent,
  RESEND_COOLDOWN_MS,
};
