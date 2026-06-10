const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    sku: { type: String, trim: true, default: '' },
    currency: { type: String, default: 'XOF', trim: true },
    active: { type: Boolean, default: true },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

productSchema.index({ userId: 1, name: 1 });
productSchema.index({ userId: 1, categoryId: 1 });

module.exports = mongoose.model('Product', productSchema);
