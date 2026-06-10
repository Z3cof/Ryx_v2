const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'XOF' },
    type: { type: String, enum: ['in', 'out'], default: 'out' },
    category: { type: String, default: 'Autre' },
    /** Si renseigné, transaction générée depuis une règle de récurrence (mois ciblé via createdAt). */
    recurringRuleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RecurringRule',
      default: null,
    },
    /** Commande boutique dont provient cette entrée (type `in`), si applicable. */
    shopOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ShopOrder',
      default: null,
    },
  },
  { timestamps: true }
);

transactionSchema.index({ userId: 1, category: 1 });
transactionSchema.index({ userId: 1, recurringRuleId: 1, createdAt: 1 });

transactionSchema.index({ userId: 1, createdAt: -1 });
module.exports = mongoose.model('Transaction', transactionSchema);
