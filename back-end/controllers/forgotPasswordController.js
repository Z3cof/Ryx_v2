const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { normalizeAndValidate } = require('../utils/phoneE164');
const {
  setOtp,
  verifyAndConsumeOtp,
  setEmailOtp,
  verifyAndConsumeEmailOtp,
  issueResetToken,
  consumeResetToken,
  issueResetTokenByPhone,
  consumeResetTokenByPhone,
  canResend,
  canResendEmail,
  markSent,
  markEmailSent,
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
 * Body: { phoneE164 } OU { email }
 * Dual-mode: sends OTP via WhatsApp (phone) or email.
 * The response is identical whether an account exists or not (no enumeration).
 */
async function sendResetCode(req, res) {
  const body = req.body || {};

  // ── Email flow ──────────────────────────────────────────────────────────────
  if (body.email) {
    const email = String(body.email).trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return sendJson(res, 400, { error: 'Adresse e-mail invalide.', code: 'EMAIL_INVALID' });
    }

    const genericOk = {
      ok: true,
      message: 'Si un compte existe avec cet e-mail, un code a été envoyé.',
    };

    const user = await User.findOne({ email }).select('_id').lean();
    if (!user) {
      return sendJson(res, 200, genericOk);
    }

    if (!canResendEmail(email)) {
      return sendJson(res, 429, {
        error: `Attendez ${Math.ceil(RESEND_COOLDOWN_MS / 1000)} secondes avant un nouvel envoi.`,
      });
    }

    const code = String(crypto.randomInt(100000, 1000000));
    setEmailOtp(email, code);
    markEmailSent(email);

    // In dev/test there is no real mail provider — expose the code
    const mock = true; // always mock unless a real mailer is wired
    const responseBody = { ...genericOk, mock };
    if (process.env.NODE_ENV !== 'production') {
      responseBody.devOtp = code;
    }
    return sendJson(res, 200, responseBody);
  }

  // ── Phone flow ──────────────────────────────────────────────────────────────
  const phoneE164 = normalizeAndValidate(body.phoneE164);
  if (!phoneE164) {
    return sendJson(res, 400, { error: 'Numéro de téléphone ou e-mail requis.', code: 'INPUT_INVALID' });
  }

  const genericOk = {
    ok: true,
    message: 'Si un compte existe avec ce numéro, un code WhatsApp a été envoyé.',
  };

  const user = await User.findOne({ phoneE164 }).select('_id').lean();
  if (!user) {
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
    const responseBody = { ...genericOk, mock: result.mock };
    if (result.mock && (process.env.NODE_ENV !== 'production' || isWhatsappMockEnabled())) {
      responseBody.devOtp = code;
    }
    return sendJson(res, 200, responseBody);
  } catch (e) {
    console.error('[Forgot password WhatsApp]', e.message || e);
    return sendJson(res, 502, {
      error: "Impossible d'envoyer le message WhatsApp. Réessayez plus tard.",
    });
  }
}

/**
 * POST /api/auth/forgot-password/verify
 * Body: { phoneE164, code } OU { email, code }
 * Returns a resetToken on success.
 */
async function verifyResetCode(req, res) {
  const body = req.body || {};
  const code = String(body.code || '').trim().replace(/\s/g, '');

  if (!/^\d{6}$/.test(code)) {
    return sendJson(res, 400, { error: 'Code à 6 chiffres requis.' });
  }

  // ── Email flow ──────────────────────────────────────────────────────────────
  if (body.email) {
    const email = String(body.email).trim().toLowerCase();
    if (!verifyAndConsumeEmailOtp(email, code)) {
      return sendJson(res, 400, { error: 'Code incorrect ou expiré.' });
    }
    const user = await User.findOne({ email }).select('_id').lean();
    if (!user) {
      return sendJson(res, 400, { error: 'Code incorrect ou expiré.' });
    }
    const resetToken = issueResetToken(email);
    return sendJson(res, 200, { ok: true, resetToken });
  }

  // ── Phone flow ──────────────────────────────────────────────────────────────
  const phoneE164 = normalizeAndValidate(body.phoneE164);
  if (!phoneE164) {
    return sendJson(res, 400, { error: 'Numéro de téléphone ou e-mail requis.', code: 'INPUT_INVALID' });
  }

  if (!verifyAndConsumeOtp(phoneE164, code)) {
    return sendJson(res, 400, { error: 'Code incorrect ou expiré.' });
  }

  const user = await User.findOne({ phoneE164 }).select('_id').lean();
  if (!user) {
    return sendJson(res, 400, { error: 'Code incorrect ou expiré.' });
  }

  const resetToken = issueResetTokenByPhone(phoneE164);
  return sendJson(res, 200, { ok: true, resetToken });
}

/**
 * POST /api/auth/forgot-password/reset
 * Body: { phoneE164, resetToken, newPassword } OU { email, resetToken, newPassword }
 */
async function resetPassword(req, res) {
  const body = req.body || {};
  const resetToken = String(body.resetToken || '').trim();
  const newPassword = String(body.newPassword || '');

  if (!resetToken) {
    return sendJson(res, 400, { error: 'Jeton de réinitialisation requis.' });
  }
  if (newPassword.length < 6) {
    return sendJson(res, 400, { error: 'Le mot de passe doit faire au moins 6 caractères.' });
  }

  // ── Email flow ──────────────────────────────────────────────────────────────
  if (body.email) {
    const email = String(body.email).trim().toLowerCase();
    if (!consumeResetToken(resetToken, email)) {
      return sendJson(res, 400, { error: 'Lien ou code expiré. Recommencez la procédure.' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return sendJson(res, 400, { error: 'Lien ou code expiré. Recommencez la procédure.' });
    }
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    return sendJson(res, 200, { ok: true, message: 'Mot de passe mis à jour. Vous pouvez vous connecter.' });
  }

  // ── Phone flow ──────────────────────────────────────────────────────────────
  const phoneE164 = normalizeAndValidate(body.phoneE164);
  if (!phoneE164) {
    return sendJson(res, 400, { error: 'Numéro de téléphone ou e-mail requis.', code: 'INPUT_INVALID' });
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
