const mongoose = require('mongoose');

/**
 * Quête RyxQuest — défi financier personnalisé généré par Rixy.
 *
 * Types de quêtes :
 *   - 'save_amount'     → épargner X FCFA ce mois-ci
 *   - 'limit_category' → ne pas dépasser X FCFA dans une catégorie
 *   - 'log_expenses'   → enregistrer X dépenses cette semaine
 *   - 'reduce_expense' → réduire les dépenses d'une catégorie de X%
 *   - 'first_action'   → première action dans l'app (onboarding)
 *   - 'streak'         → rester actif X jours consécutifs
 *   - 'custom'         → défi libre généré par Rixy
 */
const questSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    /** Titre court affiché dans la carte (ex: "Économise 5 000 FCFA") */
    title: { type: String, required: true, maxlength: 120 },
    /** Description détaillée et motivante (générée par Rixy) */
    description: { type: String, default: '', maxlength: 500 },
    /** Type de défi — permet au front de calculer la progression automatiquement */
    type: {
      type: String,
      enum: ['save_amount', 'limit_category', 'log_expenses', 'reduce_expense', 'first_action', 'streak', 'custom'],
      default: 'custom',
    },
    /** Catégorie ciblée (pour limit_category / reduce_expense) */
    targetCategory: { type: String, default: null },
    /** Valeur cible (montant, nombre, pourcentage selon le type) */
    targetValue: { type: Number, default: 0 },
    /** Valeur actuelle (mise à jour lors des check-ins) */
    currentValue: { type: Number, default: 0 },
    /** Statut de la quête */
    status: {
      type: String,
      enum: ['active', 'completed', 'expired', 'abandoned'],
      default: 'active',
    },
    /** Points d'expérience accordés à la complétion */
    xpReward: { type: Number, default: 50, min: 10, max: 500 },
    /** Difficulté (affecte l'XP et l'affichage) */
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard', 'legendary'],
      default: 'medium',
    },
    /** Emoji ou icône associée à la quête */
    icon: { type: String, default: '⚡' },
    /** Générée par Rixy (IA) ou quête de démarrage statique */
    generatedByAi: { type: Boolean, default: false },
    /** Date d'expiration (null = pas de limite) */
    expiresAt: { type: Date, default: null },
    /** Date de complétion */
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

questSchema.index({ userId: 1, status: 1 });
questSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Quest', questSchema);
