const mongoose = require('mongoose');

/**
 * Solde mensuel défini par l'utilisateur.
 * Utilisé dans l'accueil comme "solde actuelle" quand il est renseigné.
 */
const monthlyBalanceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    balance: { type: Number, required: true },
    currency: { type: String, default: 'XOF' },
  },
  { timestamps: true }
);

monthlyBalanceSchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });
module.exports = mongoose.model('MonthlyBalance', monthlyBalanceSchema);
