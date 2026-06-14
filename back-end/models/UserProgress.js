const mongoose = require('mongoose');

/**
 * Progression RyxQuest d'un utilisateur.
 * Un seul document par utilisateur (upsert).
 */

const LEVELS = [
  { name: 'Apprenti', minXp: 0 },
  { name: 'Gestionnaire', minXp: 200 },
  { name: 'Expert', minXp: 600 },
  { name: 'Maître', minXp: 1500 },
  { name: 'Architecte Financier', minXp: 3500 },
  { name: 'Légende Ryx', minXp: 7000 },
];

const userProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    /** Points d'expérience totaux accumulés */
    xp: { type: Number, default: 0, min: 0 },
    /** Nombre de quêtes complétées */
    totalQuestsCompleted: { type: Number, default: 0, min: 0 },
    /** Streak actuel (jours consécutifs avec au moins 1 action) */
    streakDays: { type: Number, default: 0, min: 0 },
    /** Meilleur streak atteint */
    bestStreak: { type: Number, default: 0, min: 0 },
    /** Dernière date d'activité (pour le calcul du streak) */
    lastActiveDate: { type: String, default: null }, // 'YYYY-MM-DD'
  },
  { timestamps: true }
);

/**
 * Retourne le niveau courant basé sur l'XP.
 * Niveaux : Apprenti (0) → Légende Ryx (7000)
 */
userProgressSchema.methods.getLevel = function () {
  let level = LEVELS[0];
  for (const l of LEVELS) {
    if (this.xp >= l.minXp) level = l;
    else break;
  }
  const idx = LEVELS.indexOf(level);
  const next = LEVELS[idx + 1] ?? null;
  return {
    name: level.name,
    index: idx,
    xpForCurrent: level.minXp,
    xpForNext: next?.minXp ?? null,
    progressPct: next
      ? Math.min(100, Math.round(((this.xp - level.minXp) / (next.minXp - level.minXp)) * 100))
      : 100,
  };
};

userProgressSchema.statics.LEVELS = LEVELS;

module.exports = mongoose.model('UserProgress', userProgressSchema);
