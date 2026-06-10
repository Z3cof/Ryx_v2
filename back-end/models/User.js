// model de l'utilisateur

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    /** E.164 après vérification WhatsApp (OTP) — unique si renseigné */
    phoneE164: { type: String, sparse: true, unique: true },
    phoneVerified: { type: Boolean, default: false },
    /** Pays choisi à l’inscription (ISO 3166-1 alpha-2) — sert à la devise d’affichage / portefeuille */
    countryIso: { type: String, default: '', trim: true, uppercase: true, maxlength: 2 },
    isMerchant: { type: Boolean, default: false }, // devient true si user est commercant
    /** Data URL (base64) image/jpeg|png|webp — utilisée comme photo de profil */
    avatar: { type: String, default: '', maxlength: 600000 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);