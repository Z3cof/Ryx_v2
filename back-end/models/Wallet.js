const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    currency: { type: String, required: true, default: 'XOF' },
    balance: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

walletSchema.index({ userId: 1, currency: 1 }, { unique: true });
module.exports = mongoose.model('Wallet', walletSchema);
