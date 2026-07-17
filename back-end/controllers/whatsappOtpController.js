const crypto = require('crypto');
const {
  setOtp,
  verifyAndConsumeOtp,
  issueRegisterToken,
  canResend,
  markSent,
  RESEND_COOLDOWN_MS,
} = require('../utils/otpStore');
const { sendOtpTemplate, isWhatsappMockEnabled } = require('../services/whatsappOtpSend');
const { normalizeAndValidate } = require('../utils/phoneE164');
const User = require('../models/User');

function isValidEmailShape(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}


/**
 * POST /api/auth/whatsapp-otp/validate-phone
 * Vérifie le numéro (E.164 valide), qu'il n'est pas déjà enregistré, sans envoyer d'OTP ni cooldown.
 * Body: { phoneE164 }
 */
async function validatePhone(req, res) {
  const phoneE164 = normalizeAndValidate(req.body?.phoneE164);
  if (!phoneE164) {
    return res.status(400).json({ error: 'Numéro de téléphone invalide.' });
  }
  const phoneTaken = await User.findOne({ phoneE164 }).select('_id').lean();
  if (phoneTaken) {
    return res.status(409).json({ error: 'Ce numéro est déjà enregistré.', code: 'PHONE_TAKEN' });
  }
  res.status(200).json({ ok: true, phoneE164 });
}

/**
 * POST /api/auth/whatsapp-otp/send
 * Body: { phoneE164, email? } — si `email` est fourni (inscription), vérifie format + disponibilité avant l'envoi.
 * L'OTP est TOUJOURS envoyé par WhatsApp (Evolution API). Pas de fallback email pour l'inscription.
 */
async function sendOtp(req, res) {
  const phoneE164 = normalizeAndValidate(req.body?.phoneE164);
  if (!phoneE164) {
    return res.status(400).json({ error: 'Numéro de téléphone invalide.', code: 'PHONE_INVALID' });
  }

  const rawEmail = req.body?.email != null ? String(req.body.email).trim() : '';
  if (rawEmail) {
    const email = rawEmail.toLowerCase();
    if (!isValidEmailShape(email)) {
      return res.status(400).json({ error: 'Email invalide.', code: 'EMAIL_INVALID' });
    }
    const emailTaken = await User.findOne({ email }).lean();
    if (emailTaken) {
      return res.status(409).json({
        error: 'Un compte existe déjà avec cet email.',
        code: 'EMAIL_TAKEN',
      });
    }
  }

  const phoneTaken = await User.findOne({ phoneE164 }).select('_id').lean();
  if (phoneTaken) {
    return res.status(409).json({ error: 'Ce numéro est déjà enregistré.', code: 'PHONE_TAKEN' });
  }

  if (!canResend(phoneE164)) {
    return res.status(429).json({
      error: `Attendez ${Math.ceil(RESEND_COOLDOWN_MS / 1000)} secondes avant un nouvel envoi.`,
    });
  }

  const code = String(crypto.randomInt(100000, 1000000));
  setOtp(phoneE164, code);
  markSent(phoneE164);

  // L'OTP est TOUJOURS envoyé par WhatsApp — pas de fallback email.
  let result;
  const digits = phoneE164.replace(/^\+/, '');
  try {
    result = await sendOtpTemplate(digits, code);
    if (result.mock) {
      console.log('[OTP WhatsApp mock]', phoneE164, rawEmail ? `email=${rawEmail}` : '', 'code=', code);
    }
  } catch (e) {
    console.error('[OTP WhatsApp]', e.message || e);
    return res.status(502).json({
      error: `Impossible d'envoyer le message WhatsApp : ${e.message || e}`,
    });
  }

  const body = { ok: true, mock: result.mock };
  // WHATSAPP_MOCK : exposer devOtp même en prod Render (staging sans domaine / sans Meta).
  if (result.mock && (process.env.NODE_ENV !== 'production' || isWhatsappMockEnabled())) {
    body.devOtp = code;
  }
  res.status(200).json(body);
}

/**
 * POST /api/auth/whatsapp-otp/verify
 * Body: { phoneE164, code }
 */
async function verifyOtp(req, res) {
  const phoneE164 = normalizeAndValidate(req.body?.phoneE164);
  if (!phoneE164) {
    return res.status(400).json({ error: 'Numéro de téléphone invalide.' });
  }

  const code = String(req.body?.code || '').trim().replace(/\s/g, '');
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'Code à 6 chiffres requis.' });
  }

  if (!verifyAndConsumeOtp(phoneE164, code)) {
    return res.status(400).json({ error: 'Code incorrect ou expiré.' });
  }

  const verificationToken = issueRegisterToken(phoneE164);
  res.status(200).json({ ok: true, verificationToken });
}

module.exports = { validatePhone, sendOtp, verifyOtp };
