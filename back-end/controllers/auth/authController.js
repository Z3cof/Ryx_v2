const bcrypt = require('bcryptjs');
const { parsePhoneNumberFromString } = require('libphonenumber-js');
const User = require('../../models/User');
const { normalizeAndValidate } = require('../../utils/phoneE164');
const { consumeRegisterToken } = require('../../utils/otpStore');
const { signUserToken } = require('../../utils/jwt');

function sendJson(res, status, data) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(data));
}

/**
 * POST /api/auth/register
 * Crée un nouvel utilisateur.
 */
async function register(req, res) {
  console.log('[auth] POST /register reçu', {
    name: !!req.body?.name,
    email: !!req.body?.email,
    password: !!req.body?.password,
  });
  const body = req.body || {};
  const { name, email, password, phoneE164: rawPhone, phoneVerificationToken, countryIso: rawCountry } = body;

  if (!name || !email || !password) {
    return sendJson(res, 400, { error: 'Nom, email et mot de passe requis.' });
  }

  const phoneE164 = normalizeAndValidate(rawPhone);
  const verifyToken = String(phoneVerificationToken || '').trim();
  if (!phoneE164 || !verifyToken) {
    return sendJson(res, 400, { error: 'Téléphone vérifié (OTP WhatsApp) requis.' });
  }
  if (!consumeRegisterToken(verifyToken, phoneE164)) {
    return sendJson(res, 400, { error: 'Vérification téléphone invalide ou expirée. Renvoyez un code.' });
  }

  const emailNorm = String(email).trim().toLowerCase();
  const existing = await User.findOne({ email: emailNorm });
  if (existing) {
    return sendJson(res, 400, { error: 'Un compte existe déjà avec cet email.' });
  }

  const phoneTaken = await User.findOne({ phoneE164 });
  if (phoneTaken) {
    return sendJson(res, 400, { error: 'Ce numéro est déjà enregistré.' });
  }

  const hashed = await bcrypt.hash(String(password), 10);
  /** Le numéro vérifié est la source de vérité pour le pays (ex. +243 → CD, CDF). */
  let countryIso = '';
  const parsedCountry = parsePhoneNumberFromString(phoneE164);
  if (parsedCountry?.country) {
    countryIso = String(parsedCountry.country).toUpperCase().slice(0, 2);
  } else if (rawCountry != null && String(rawCountry).trim()) {
    const c = String(rawCountry).trim().toUpperCase().slice(0, 2);
    if (/^[A-Z]{2}$/.test(c)) countryIso = c;
  }
  const user = await User.create({
    name: String(name).trim(),
    email: emailNorm,
    password: hashed,
    phoneE164,
    phoneVerified: true,
    ...(countryIso ? { countryIso } : {}),
  });

  const obj = user.toObject();
  delete obj.password;
  const token = signUserToken(user._id);
  sendJson(res, 201, { user: obj, message: 'Compte créé.', token });
}

/**
 * POST /api/auth/login
 * Connecte un utilisateur (phoneE164 + mot de passe, ou email + mot de passe).
 */
async function login(req, res) {
  const body = req.body || {};
  const { email, password, phoneE164: rawPhone } = body;

  if (!password) {
    return sendJson(res, 400, { error: 'Mot de passe requis.' });
  }
  if (!rawPhone && !email) {
    return sendJson(res, 400, { error: 'Numéro de téléphone ou email requis.' });
  }

  let user = null;

  // Priorité : connexion par numéro de téléphone
  if (rawPhone) {
    const phoneE164 = normalizeAndValidate(rawPhone);
    if (!phoneE164) {
      return sendJson(res, 400, { error: 'Numéro de téléphone invalide.' });
    }
    user = await User.findOne({ phoneE164 });
    if (!user) {
      return sendJson(res, 401, { error: 'Numéro de téléphone ou mot de passe incorrect.' });
    }
  } else {
    // Fallback : connexion par email
    const emailNorm = String(email).trim().toLowerCase();
    user = await User.findOne({ email: emailNorm });
    if (!user) {
      return sendJson(res, 401, { error: 'Email ou mot de passe incorrect.' });
    }
  }

  const ok = await bcrypt.compare(String(password), user.password);
  if (!ok) {
    return sendJson(res, 401, { error: rawPhone ? 'Numéro de téléphone ou mot de passe incorrect.' : 'Email ou mot de passe incorrect.' });
  }

  const obj = user.toObject();
  delete obj.password;
  const token = signUserToken(user._id);
  sendJson(res, 200, { user: obj, message: 'Connexion réussie.', token });
}

/**
 * GET /api/auth/me — utilisateur courant (Authorization: Bearer).
 */
async function me(req, res) {
  const user = await User.findById(req.authUserId).lean();
  if (!user) {
    return sendJson(res, 401, { error: 'Utilisateur introuvable.' });
  }
  const obj = { ...user };
  delete obj.password;
  sendJson(res, 200, { user: obj });
}

module.exports = {
  register,
  login,
  me,
};
