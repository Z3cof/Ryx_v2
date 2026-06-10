const mongoose = require('mongoose');

const recurringRuleSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['in', 'out'], required: true },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, default: 'Autre', trim: true },
    currency: { type: String, default: 'XOF' },
    /** `day` | `week` | `month` — pilotage de ensure-month (occurrences dans le mois). */
    cadence: { type: String, enum: ['day', 'week', 'month'], default: 'month' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

recurringRuleSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('RecurringRule', recurringRuleSchema);
