const mongoose = require('mongoose');

const projectGoalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    targetAmount: { type: Number, required: true, min: 0.01 },
    currentAmount: { type: Number, default: 0, min: 0 },
    autoEnabled: { type: Boolean, default: false },
    autoAmount: { type: Number, default: 0, min: 0 },
    autoCadence: { type: String, enum: ['day', 'week', 'month'], default: 'month' },
    lastAutoFillAt: { type: Date, default: null },
    currency: { type: String, default: 'XOF' },
  },
  { timestamps: true }
);

projectGoalSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('ProjectGoal', projectGoalSchema);
