const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { parsePhoneNumberFromString } = require('libphonenumber-js');
const User = require('../models/User');
const { normalizeAndValidate } = require('../utils/phoneE164');
const { consumeRegisterToken } = require('../utils/otpStore');
const Transaction = require('../models/Transaction');
const RecurringRule = require('../models/RecurringRule');
const UserProgress = require('../models/UserProgress');
const MonthlyBalance = require('../models/MonthlyBalance');
const MonthlyBudget = require('../models/MonthlyBudget');
const Wallet = require('../models/Wallet');


/**
 * PATCH /api/users/:userId
 * Body: { isMerchant?: boolean, name?: string, email?: string, avatar?: string | null }
 * Champs fournis uniquement : mise à jour partielle.
 */
async function updateUser(req, res) {
  const { userId } = req.params;
  const body = req.body || {};

  if (!userId) {
    return res.status(400).json({ error: 'userId requis.' });
  }

  const updates = {};

  if (typeof body.name === 'string' && body.name.trim()) {
    updates.name = body.name.trim();
  }

  if (typeof body.email === 'string' && body.email.trim()) {
    const email = body.email.trim().toLowerCase();
    const taken = await User.findOne({ email, _id: { $ne: userId } }).select('_id').lean();
    if (taken) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé.' });
    }
    updates.email = email;
  }

  if (typeof body.isMerchant === 'boolean') {
    updates.isMerchant = body.isMerchant;
  }

  if ('avatar' in body) {
    if (body.avatar === null || body.avatar === '') {
      updates.avatar = '';
    } else if (typeof body.avatar === 'string') {
      const a = body.avatar.trim();
      const dataUrlRe =
        /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/;
      if (!dataUrlRe.test(a) || a.length > 600000) {
        return res.status(400).json({
          error: 'Photo invalide ou trop lourde (réduis la taille ou choisis une autre image).',
        });
      }
      updates.avatar = a;
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Aucune modification.' });
  }

  const user = await User.findByIdAndUpdate(userId, updates, { new: true })
    .select('name email isMerchant avatar')
    .lean();

  if (!user) {
    return res.status(404).json({ error: 'Utilisateur introuvable.' });
  }

  res.status(200).json({ user });
}

/**
 * PATCH /api/users/:userId/phone
 * Body: { phoneE164, phoneVerificationToken } — même flux OTP WhatsApp que l’inscription.
 */
async function updatePhone(req, res) {
  const { userId } = req.params;
  const body = req.body || {};
  const phoneE164 = normalizeAndValidate(body.phoneE164);
  const token = String(body.phoneVerificationToken || '').trim();

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: 'userId requis.' });
  }
  if (!phoneE164 || !token) {
    return res.status(400).json({ error: 'Numéro vérifié et code de confirmation requis.' });
  }
  if (!consumeRegisterToken(token, phoneE164)) {
    return res.status(400).json({
      error: 'Vérification invalide ou expirée. Demande un nouveau code WhatsApp.',
    });
  }

  const taken = await User.findOne({
    phoneE164,
    _id: { $ne: new mongoose.Types.ObjectId(userId) },
  })
    .select('_id')
    .lean();
  if (taken) {
    return res.status(400).json({ error: 'Ce numéro est déjà utilisé par un autre compte.' });
  }

  let countryIso = '';
  const parsed = parsePhoneNumberFromString(phoneE164);
  if (parsed?.country) {
    countryIso = String(parsed.country).toUpperCase().slice(0, 2);
  }

  const user = await User.findByIdAndUpdate(
    userId,
    {
      phoneE164,
      phoneVerified: true,
      ...(countryIso ? { countryIso } : {}),
    },
    { new: true }
  )
    .select('name email isMerchant avatar phoneE164 phoneVerified countryIso')
    .lean();

  if (!user) {
    return res.status(404).json({ error: 'Utilisateur introuvable.' });
  }

  res.status(200).json({ user });
}

/**
 * PATCH /api/users/:userId/password
 * Body: { currentPassword: string, newPassword: string }
 */
async function changePassword(req, res) {
  const { userId } = req.params;
  const { currentPassword, newPassword } = req.body || {};

  if (!userId) {
    return res.status(400).json({ error: 'userId requis.' });
  }
  if (currentPassword == null || newPassword == null) {
    return res.status(400).json({ error: 'Mot de passe actuel et nouveau mot de passe requis.' });
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({ error: 'Le nouveau mot de passe doit faire au moins 6 caractères.' });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ error: 'Utilisateur introuvable.' });
  }

  const ok = await bcrypt.compare(String(currentPassword), user.password);
  if (!ok) {
    return res.status(401).json({ error: 'Mot de passe actuel incorrect.' });
  }

  const sameAsStored = await bcrypt.compare(String(newPassword), user.password);
  if (sameAsStored) {
    return res.status(400).json({
      error: 'Le nouveau mot de passe doit être différent de l’actuel.',
    });
  }

  user.password = await bcrypt.hash(String(newPassword), 10);
  await user.save();

  res.status(200).json({ message: 'Mot de passe mis à jour.' });
}

/**
 * DELETE /api/users/:userId
 * Body: { password: string } — mot de passe actuel pour confirmer.
 * Supprime l'utilisateur et les données associées (transactions, quêtes, règles, etc.).
 */
async function deleteAccount(req, res) {
  const { userId } = req.params;
  const { password } = req.body || {};

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: 'userId invalide.' });
  }
  if (password == null || String(password).length === 0) {
    return res.status(400).json({ error: 'Mot de passe requis pour supprimer le compte.' });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ error: 'Utilisateur introuvable.' });
  }

  const ok = await bcrypt.compare(String(password), user.password);
  if (!ok) {
    return res.status(401).json({ error: 'Mot de passe incorrect.' });
  }

  const oid = new mongoose.Types.ObjectId(userId);

  try {
    await Transaction.deleteMany({ userId: oid });
    await RecurringRule.deleteMany({ userId: oid });
    await MonthlyBalance.deleteMany({ userId: oid });
    await MonthlyBudget.deleteMany({ userId: oid });
    await Wallet.deleteMany({ userId: oid });
    await UserProgress.deleteMany({ userId: oid });

    const result = await User.deleteOne({ _id: oid });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Utilisateur introuvable.' });
    }

    res.status(200).json({ message: 'Compte supprimé.' });
  } catch (err) {
    console.error('[user] deleteAccount', err);
    return res.status(500).json({ error: 'Suppression impossible pour le moment.' });
  }
}

module.exports = { updateUser, updatePhone, changePassword, deleteAccount };
