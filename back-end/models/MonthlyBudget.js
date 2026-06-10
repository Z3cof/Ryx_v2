const mongoose = require('mongoose');

/**
 * Seuil de dépenses par mois (à ne pas dépasser).
 * Données utilisées pour le modèle IA (recommandations, alertes).
 */
const monthlyBudgetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'XOF' },
  },
  { timestamps: true }
);

monthlyBudgetSchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });
module.exports = mongoose.model('MonthlyBudget', monthlyBudgetSchema);
