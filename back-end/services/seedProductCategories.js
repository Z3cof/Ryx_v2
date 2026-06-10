const Category = require('../models/Category');
const Product = require('../models/Product');

const DEFAULT_PRODUCT_CATEGORIES = [
  'Alimentaire',
  'Boissons',
  'Hygiène & beauté',
  'Électronique & accessoires',
  'Textile & chaussures',
  'Maison & déco',
  'Autre',
];

let cachedAutreObjectId = null;

function setCachedAutreId(id) {
  cachedAutreObjectId = id || null;
}

/**
 * Crée les catégories type `product` si aucune n’existe. Idempotent.
 * Associe aussi les produits sans catégorie à « Autre ».
 */
async function seedProductCategories() {
  const n = await Category.countDocuments({ type: 'product' });
  if (n > 0) {
    const autre = await Category.findOne({ type: 'product', name: 'Autre' }).lean();
    setCachedAutreId(autre?._id || null);
    return;
  }
  const inserted = await Category.insertMany(
    DEFAULT_PRODUCT_CATEGORIES.map((name) => ({ name, type: 'product' }))
  );
  const autre = inserted.find((d) => d.name === 'Autre');
  setCachedAutreId(autre?._id || null);
  console.log('[Ryx] Catégories produit créées :', inserted.length);

  if (cachedAutreObjectId) {
    await Product.updateMany(
      {
        $or: [{ categoryId: null }, { categoryId: { $exists: false } }],
      },
      { $set: { categoryId: cachedAutreObjectId } }
    );
  }
}

async function getDefaultProductCategoryId() {
  if (cachedAutreObjectId) return cachedAutreObjectId;
  const autre = await Category.findOne({ type: 'product', name: 'Autre' }).lean();
  setCachedAutreId(autre?._id || null);
  return cachedAutreObjectId;
}

module.exports = {
  seedProductCategories,
  getDefaultProductCategoryId,
  setCachedAutreId,
};
