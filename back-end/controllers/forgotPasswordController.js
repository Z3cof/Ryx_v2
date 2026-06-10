const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { normalizeAndValidate } = require('../utils/phoneE164');
const {
  setOtp,
  verifyAndConsumeOtp,
  issueResetTokenByPhone,
  consumeResetTokenByPhone,
  canResend,
  markSent,
  RESEND_COOLDOWN_MS,
} = require('../utils/otpStore');
const { sendOtpTemplate, isWhatsappMockEnabled } = require('../services/whatsappOtpSend');

function sendJson(res, status, data) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(data));
}

/**
 * POST /api/auth/forgot-password/send
 * Body: { phoneE164 }
 * Envoie un code OTP par WhatsApp si le numéro est enregistré.
 * La réponse est identique qu'il y ait un compte ou non (sécurité : pas d'énumération).
 */
async function sendResetCode(req, res) {
  const phoneE164 = normalizeAndValidate(req.body?.phoneE164);
  if (!phoneE164) {
    return sendJson(res, 400, { error: 'Numéro de téléphone invalide.', code: 'PHONE_INVALID' });
  }

  const genericOk = {
    ok: true,
    message: 'Si un compte existe avec ce numéro, un code WhatsApp a été envoyé.',
  };

  const user = await User.findOne({ phoneE164 }).select('_id').lean();
  if (!user) {
    // Réponse générique pour ne pas révéler l'existence du compte
    return sendJson(res, 200, genericOk);
  }

  if (!canResend(phoneE164)) {
    return sendJson(res, 429, {
      error: `Attendez ${Math.ceil(RESEND_COOLDOWN_MS / 1000)} secondes avant un nouvel envoi.`,
    });
  }

  const code = String(crypto.randomInt(100000, 1000000));
  setOtp(phoneE164, code);
  markSent(phoneE164);

  const digits = phoneE164.replace(/^\+/, '');

  try {
    const result = await sendOtpTemplate(digits, code);

    const body = { ...genericOk, mock: result.mock };
    // En mode mock (dev/test), exposer le code pour faciliter les tests
    if (result.mock && (process.env.NODE_ENV !== 'production' || isWhatsappMockEnabled())) {
      body.devOtp = code;
    }
    return sendJson(res, 200, body);
  } catch (e) {
    console.error('[Forgot password WhatsApp]', e.message || e);
    return sendJson(res, 502, {
      error: "Impossible d'envoyer le message WhatsApp. Réessayez plus tard.",
    });
  }
}

/**
 * POST /api/auth/forgot-password/verify
 * Body: { phoneE164, code }
 * Vérifie le code OTP et retourne un resetToken.
 */
async function verifyResetCode(req, res) {
  const phoneE164 = normalizeAndValidate(req.body?.phoneE164);
  if (!phoneE164) {
    return sendJson(res, 400, { error: 'Numéro de téléphone invalide.', code: 'PHONE_INVALID' });
  }

  const code = String(req.body?.code || '').trim().replace(/\s/g, '');
  if (!/^\d{6}$/.test(code)) {
    return sendJson(res, 400, { error: 'Code à 6 chiffres requis.' });
  }

  if (!verifyAndConsumeOtp(phoneE164, code)) {
    return sendJson(res, 400, { error: 'Code incorrect ou expiré.' });
  }

  // Vérifier que l'utilisateur existe bien
  const user = await User.findOne({ phoneE164 }).select('_id').lean();
  if (!user) {
    return sendJson(res, 400, { error: 'Code incorrect ou expiré.' });
  }

  const resetToken = issueResetTokenByPhone(phoneE164);
  return sendJson(res, 200, { ok: true, resetToken });
}

/**
 * POST /api/auth/forgot-password/reset
 * Body: { phoneE164, resetToken, newPassword }
 * Réinitialise le mot de passe après vérification du token.
 */
async function resetPassword(req, res) {
  const phoneE164 = normalizeAndValidate(req.body?.phoneE164);
  if (!phoneE164) {
    return sendJson(res, 400, { error: 'Numéro de téléphone invalide.', code: 'PHONE_INVALID' });
  }

  const resetToken = String(req.body?.resetToken || '').trim();
  if (!resetToken) {
    return sendJson(res, 400, { error: 'Jeton de réinitialisation requis.' });
  }

  const newPassword = String(req.body?.newPassword || '');
  if (newPassword.length < 6) {
    return sendJson(res, 400, { error: 'Le mot de passe doit faire au moins 6 caractères.' });
  }

  if (!consumeResetTokenByPhone(resetToken, phoneE164)) {
    return sendJson(res, 400, { error: 'Lien ou code expiré. Recommencez la procédure.' });
  }

  const user = await User.findOne({ phoneE164 });
  if (!user) {
    return sendJson(res, 400, { error: 'Lien ou code expiré. Recommencez la procédure.' });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  return sendJson(res, 200, {
    ok: true,
    message: 'Mot de passe mis à jour. Vous pouvez vous connecter.',
  });
}

module.exports = { sendResetCode, verifyResetCode, resetPassword };
