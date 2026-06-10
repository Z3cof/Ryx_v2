const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const shopOrderSchema = new mongoose.Schema(
  {
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'delivered', 'cancelled'],
      default: 'pending',
    },
    items: { type: [orderItemSchema], required: true, validate: [(v) => v.length > 0, 'Au moins une ligne'] },
    totalAmount: { type: Number, required: true, min: 0 },
    notes: { type: String, trim: true, default: '' },
    /** Renseigné à la confirmation — sert au CA mensuel boutique et au dashboard (Transaction liée). */
    confirmedAt: { type: Date, default: null },
    incomeTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null,
    },
  },
  { timestamps: true }
);

shopOrderSchema.index({ merchantId: 1, createdAt: -1 });

module.exports = mongoose.model('ShopOrder', shopOrderSchema);
