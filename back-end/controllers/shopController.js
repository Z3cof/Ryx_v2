const mongoose = require('mongoose');
const User = require('../models/User');
const Sale = require('../models/Sale');
const Category = require('../models/Category');
const Product = require('../models/Product');
const ShopOrder = require('../models/ShopOrder');
const Transaction = require('../models/Transaction');
const Wallet = require('../models/Wallet');
const { getDefaultProductCategoryId } = require('../services/seedProductCategories');

function sendJson(res, status, data) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(data));
}

async function assertMerchant(userId) {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return { error: 400, msg: 'userId invalide.' };
  }
  const user = await User.findById(userId).select('isMerchant').lean();
  if (!user) {
    return { error: 404, msg: 'Utilisateur introuvable.' };
  }
  if (!user.isMerchant) {
    return { error: 403, msg: 'Réservé aux comptes vendeur.' };
  }
  return { oid: new mongoose.Types.ObjectId(userId) };
}

async function categoryNameMapForIds(idStrings) {
  const unique = [...new Set((idStrings || []).filter(Boolean).map(String))];
  const oids = unique
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  if (oids.length === 0) return new Map();
  const rows = await Category.find({ _id: { $in: oids } }).select('name').lean();
  return new Map(rows.map((r) => [r._id.toString(), r.name]));
}

function formatProductLean(p, nameMap) {
  const cid = p.categoryId ? String(p.categoryId) : '';
  return {
    id: p._id.toString(),
    name: p.name,
    price: Number(p.price) || 0,
    stock: Number(p.stock) || 0,
    sku: p.sku || '',
    currency: p.currency || 'XOF',
    active: p.active !== false,
    categoryId: cid || null,
    categoryName: cid ? nameMap?.get(cid) || 'Catégorie' : 'Autre',
  };
}

function formatOrderSummary(o) {
  return {
    id: o._id.toString(),
    customerName: o.customerName,
    customerPhone: o.customerPhone || '',
    totalAmount: Number(o.totalAmount) || 0,
    status: o.status,
    createdAt: o.createdAt,
    itemCount: (o.items && o.items.length) || 0,
  };
}

function formatOrderDetail(o) {
  return {
    id: o._id.toString(),
    customerName: o.customerName,
    customerPhone: o.customerPhone || '',
    status: o.status,
    totalAmount: Number(o.totalAmount) || 0,
    notes: o.notes || '',
    items: (o.items || []).map((it) => ({
      productId: it.productId.toString(),
      name: it.name,
      unitPrice: Number(it.unitPrice) || 0,
      quantity: it.quantity,
      lineTotal: Number(it.lineTotal) || 0,
    })),
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

const ORDER_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

/**
 * GET /api/shop/:userId
 */
async function getShopSummary(req, res) {
  const gate = await assertMerchant(req.params.userId);
  if (gate.error) {
    return sendJson(res, gate.error, { error: gate.msg });
  }
  const { oid } = gate;

  const now = new Date();
  const y = now.getFullYear();
  const mon = now.getMonth();

  const startThis = new Date(y, mon, 1);
  const endThis = new Date(y, mon + 1, 0, 23, 59, 59, 999);
  const startPrev = new Date(y, mon - 1, 1);
  const endPrev = new Date(y, mon, 0, 23, 59, 59, 999);

  const [
    thisMonthSales,
    prevMonthAgg,
    recentSalesDocs,
    catalogProducts,
    recentOrdersDocs,
    orderThisAgg,
    orderPrevAgg,
    ordersInMonthForCategories,
    productCategoryList,
  ] = await Promise.all([
    Sale.find({ user: oid, date: { $gte: startThis, $lte: endThis } }).lean(),
    Sale.aggregate([
      { $match: { user: oid, date: { $gte: startPrev, $lte: endPrev } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Sale.find({ user: oid }).sort({ date: -1 }).limit(20).populate('category', 'name').lean(),
    Product.find({ userId: oid, active: true }).sort({ name: 1 }).limit(200).lean(),
    ShopOrder.find({ merchantId: oid }).sort({ createdAt: -1 }).limit(12).lean(),
    ShopOrder.aggregate([
      {
        $match: {
          merchantId: oid,
          status: { $in: ['confirmed', 'delivered'] },
          confirmedAt: { $gte: startThis, $lte: endThis },
        },
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
    ]),
    ShopOrder.aggregate([
      {
        $match: {
          merchantId: oid,
          status: { $in: ['confirmed', 'delivered'] },
          confirmedAt: { $gte: startPrev, $lte: endPrev },
        },
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
    ShopOrder.find({
      merchantId: oid,
      status: { $in: ['confirmed', 'delivered'] },
      confirmedAt: { $gte: startThis, $lte: endThis },
    })
      .select('items')
      .lean(),
    Category.find({ type: 'product' }).sort({ name: 1 }).select('name').lean(),
  ]);

  let monthlyRevenue = 0;
  const byCat = new Map();
  for (const s of thisMonthSales) {
    monthlyRevenue += Math.abs(Number(s.amount) || 0);
    const cid = String(s.category);
    const row = byCat.get(cid) || { total: 0, count: 0 };
    row.total += Math.abs(Number(s.amount) || 0);
    row.count += 1;
    byCat.set(cid, row);
  }

  const orderMonthTotal = orderThisAgg[0]?.total ? Math.abs(Number(orderThisAgg[0].total)) : 0;
  const orderMonthCount = Number(orderThisAgg[0]?.count) || 0;
  monthlyRevenue += orderMonthTotal;

  const defaultCatId = await getDefaultProductCategoryId();
  const defaultCatStr = defaultCatId ? String(defaultCatId) : '';
  const pidSet = new Set();
  for (const o of ordersInMonthForCategories) {
    for (const line of o.items || []) {
      pidSet.add(String(line.productId));
    }
  }
  const pidList = [...pidSet]
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  const prodRows =
    pidList.length > 0
      ? await Product.find({ _id: { $in: pidList } }).select('categoryId').lean()
      : [];
  const pidToCat = new Map();
  for (const pr of prodRows) {
    const c = pr.categoryId ? String(pr.categoryId) : defaultCatStr;
    pidToCat.set(String(pr._id), c);
  }
  for (const o of ordersInMonthForCategories) {
    for (const line of o.items || []) {
      const pid = String(line.productId);
      let cid = pidToCat.get(pid) || defaultCatStr;
      if (!cid) continue;
      const amt = Math.abs(Number(line.lineTotal) || 0);
      const row = byCat.get(cid) || { total: 0, count: 0 };
      row.total += amt;
      row.count += 1;
      byCat.set(cid, row);
    }
  }

  let salesCountMonth = thisMonthSales.length + orderMonthCount;
  const avgSaleAmount = salesCountMonth > 0 ? monthlyRevenue / salesCountMonth : 0;
  const categoriesActive = byCat.size;

  let revenuePrevMonth = prevMonthAgg[0]?.total ? Math.abs(Number(prevMonthAgg[0].total)) : 0;
  const revenuePrevOrders = orderPrevAgg[0]?.total ? Math.abs(Number(orderPrevAgg[0].total)) : 0;
  revenuePrevMonth += revenuePrevOrders;
  let revenueChangePercent = null;
  if (revenuePrevMonth > 0) {
    revenueChangePercent =
      Math.round(((monthlyRevenue - revenuePrevMonth) / revenuePrevMonth) * 1000) / 10;
  }

  const catIds = Array.from(byCat.keys())
    .filter(Boolean)
    .map((id) => new mongoose.Types.ObjectId(id));
  const cats =
    catIds.length > 0 ? await Category.find({ _id: { $in: catIds } }).select('name').lean() : [];
  const idToName = new Map(cats.map((c) => [c._id.toString(), c.name]));

  const topCategories = Array.from(byCat.entries())
    .map(([cid, v]) => ({
      categoryId: cid,
      name: idToName.get(cid) || 'Catégorie',
      totalAmount: v.total,
      saleCount: v.count,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  const productCatIdSet = new Set(productCategoryList.map((c) => c._id.toString()));
  let miscTotal = 0;
  let miscCount = 0;
  for (const [cid, v] of byCat.entries()) {
    if (!productCatIdSet.has(cid)) {
      miscTotal += v.total;
      miscCount += v.count;
    }
  }

  const productCategoryBreakdown = productCategoryList.map((c) => {
    const cid = c._id.toString();
    const v = byCat.get(cid) || { total: 0, count: 0 };
    return {
      categoryId: cid,
      name: c.name,
      totalAmount: v.total,
      saleCount: v.count,
    };
  });
  if (miscTotal > 0 || miscCount > 0) {
    productCategoryBreakdown.push({
      categoryId: '__other__',
      name: 'Autres ventes',
      totalAmount: miscTotal,
      saleCount: miscCount,
    });
  }
  productCategoryBreakdown.sort((a, b) => b.totalAmount - a.totalAmount);

  const recentSales = recentSalesDocs.map((s) => ({
    id: s._id.toString(),
    amount: Math.abs(Number(s.amount) || 0),
    description: s.description || '',
    date: s.date,
    categoryName: s.category?.name || '—',
  }));

  const catalogCatNameMap = await categoryNameMapForIds([
    ...catalogProducts.map((p) => (p.categoryId ? String(p.categoryId) : '')),
  ]);

  let shopCurrency = 'XOF';
  if (catalogProducts.length > 0 && catalogProducts[0].currency) {
    shopCurrency = String(catalogProducts[0].currency).trim().toUpperCase() || 'XOF';
  } else {
    const w = await Wallet.findOne({ userId: oid }).sort({ currency: 1 }).lean();
    if (w?.currency) shopCurrency = String(w.currency).trim().toUpperCase();
  }

  sendJson(res, 200, {
    currency: shopCurrency,
    monthlyRevenue,
    salesCountMonth,
    avgSaleAmount,
    categoriesActive,
    revenuePrevMonth,
    revenueChangePercent,
    topCategories,
    productCategoryBreakdown,
    recentSales,
    catalogProducts: catalogProducts.map((p) => formatProductLean(p, catalogCatNameMap)),
    recentOrders: recentOrdersDocs.map(formatOrderSummary),
    productCategories: productCategoryList.map((c) => ({ id: c._id.toString(), name: c.name })),
  });
}

/**
 * GET /api/shop/:userId/products/:productId
 */
async function getProduct(req, res) {
  const gate = await assertMerchant(req.params.userId);
  if (gate.error) {
    return sendJson(res, gate.error, { error: gate.msg });
  }
  const { productId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return sendJson(res, 400, { error: 'productId invalide.' });
  }
  const p = await Product.findOne({ _id: productId, userId: gate.oid }).lean();
  if (!p) {
    return sendJson(res, 404, { error: 'Produit introuvable.' });
  }
  const nameMap = await categoryNameMapForIds([p.categoryId ? String(p.categoryId) : '']);
  sendJson(res, 200, { product: formatProductLean(p, nameMap) });
}

/**
 * POST /api/shop/:userId/products
 */
async function createProduct(req, res) {
  const gate = await assertMerchant(req.params.userId);
  if (gate.error) {
    return sendJson(res, gate.error, { error: gate.msg });
  }
  const body = req.body || {};
  const name = String(body.name || '').trim();
  const price = Number(body.price);
  const stock = body.stock != null ? Number(body.stock) : 0;
  if (!name) {
    return sendJson(res, 400, { error: 'Nom requis.' });
  }
  if (!Number.isFinite(price) || price < 0) {
    return sendJson(res, 400, { error: 'Prix invalide.' });
  }
  if (!Number.isFinite(stock) || stock < 0) {
    return sendJson(res, 400, { error: 'Stock invalide.' });
  }
  let sku = String(body.sku || '').trim();
  if (!sku) {
    sku = `RYX-${Date.now().toString(36).toUpperCase()}`;
  }

  let categoryOid = null;
  const rawCat = body.categoryId;
  if (rawCat && mongoose.Types.ObjectId.isValid(String(rawCat))) {
    const c = await Category.findOne({ _id: rawCat, type: 'product' }).lean();
    if (!c) {
      return sendJson(res, 400, { error: 'Catégorie produit invalide.' });
    }
    categoryOid = c._id;
  } else {
    categoryOid = await getDefaultProductCategoryId();
  }
  if (!categoryOid) {
    return sendJson(res, 500, { error: 'Catégories produit non initialisées (redémarre le serveur).' });
  }

  const doc = await Product.create({
    userId: gate.oid,
    name,
    price,
    stock,
    sku,
    currency: String(body.currency || 'XOF').trim() || 'XOF',
    categoryId: categoryOid,
  });
  const nameMap = await categoryNameMapForIds([String(categoryOid)]);
  sendJson(res, 201, { product: formatProductLean(doc.toObject(), nameMap) });
}

/**
 * PATCH /api/shop/:userId/products/:productId
 */
async function updateProduct(req, res) {
  const gate = await assertMerchant(req.params.userId);
  if (gate.error) {
    return sendJson(res, gate.error, { error: gate.msg });
  }
  const { productId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return sendJson(res, 400, { error: 'productId invalide.' });
  }
  const body = req.body || {};
  const patch = {};
  if (body.name != null) {
    patch.name = String(body.name).trim();
    if (!patch.name) {
      return sendJson(res, 400, { error: 'Nom invalide.' });
    }
  }
  if (body.price != null) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) {
      return sendJson(res, 400, { error: 'Prix invalide.' });
    }
    patch.price = price;
  }
  if (body.stock != null) {
    const stock = Number(body.stock);
    if (!Number.isFinite(stock) || stock < 0) {
      return sendJson(res, 400, { error: 'Stock invalide.' });
    }
    patch.stock = stock;
  }
  if (body.sku != null) {
    patch.sku = String(body.sku).trim();
  }
  if (body.active != null) {
    patch.active = !!body.active;
  }
  if (body.categoryId !== undefined) {
    const raw = body.categoryId;
    if (raw === null || raw === '') {
      patch.categoryId = await getDefaultProductCategoryId();
    } else if (mongoose.Types.ObjectId.isValid(String(raw))) {
      const c = await Category.findOne({ _id: raw, type: 'product' }).lean();
      if (!c) {
        return sendJson(res, 400, { error: 'Catégorie produit invalide.' });
      }
      patch.categoryId = c._id;
    } else {
      return sendJson(res, 400, { error: 'Catégorie produit invalide.' });
    }
    if (!patch.categoryId) {
      return sendJson(res, 500, { error: 'Catégorie « Autre » introuvable.' });
    }
  }
  if (Object.keys(patch).length === 0) {
    return sendJson(res, 400, { error: 'Rien à modifier.' });
  }
  const doc = await Product.findOneAndUpdate(
    { _id: productId, userId: gate.oid },
    { $set: patch },
    { new: true }
  ).lean();
  if (!doc) {
    return sendJson(res, 404, { error: 'Produit introuvable.' });
  }
  const nameMap = await categoryNameMapForIds([doc.categoryId ? String(doc.categoryId) : '']);
  sendJson(res, 200, { product: formatProductLean(doc, nameMap) });
}

/**
 * DELETE /api/shop/:userId/products/:productId
 */
async function deleteProduct(req, res) {
  const gate = await assertMerchant(req.params.userId);
  if (gate.error) {
    return sendJson(res, gate.error, { error: gate.msg });
  }
  const { productId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return sendJson(res, 400, { error: 'productId invalide.' });
  }
  const r = await Product.deleteOne({ _id: productId, userId: gate.oid });
  if (r.deletedCount === 0) {
    return sendJson(res, 404, { error: 'Produit introuvable.' });
  }
  sendJson(res, 200, { ok: true });
}

/**
 * GET /api/shop/:userId/orders
 */
async function listOrders(req, res) {
  const gate = await assertMerchant(req.params.userId);
  if (gate.error) {
    return sendJson(res, gate.error, { error: gate.msg });
  }
  const list = await ShopOrder.find({ merchantId: gate.oid })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  sendJson(res, 200, { orders: list.map(formatOrderDetail) });
}

/**
 * POST /api/shop/:userId/orders
 */
async function createOrder(req, res) {
  const gate = await assertMerchant(req.params.userId);
  if (gate.error) {
    return sendJson(res, gate.error, { error: gate.msg });
  }
  const body = req.body || {};
  const customerName = String(body.customerName || '').trim();
  const customerPhone = String(body.customerPhone || '').trim();
  const notes = String(body.notes || '').trim();
  const rawItems = body.items;

  if (!customerName) {
    return sendJson(res, 400, { error: 'Nom client requis.' });
  }
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return sendJson(res, 400, { error: 'Au moins un article requis.' });
  }

  const { oid } = gate;
  const lines = [];
  let total = 0;

  for (const row of rawItems) {
    const productId = row.productId;
    const quantity = Number(row.quantity);
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return sendJson(res, 400, { error: 'productId invalide.' });
    }
    if (!Number.isFinite(quantity) || quantity < 1) {
      return sendJson(res, 400, { error: 'Quantité invalide.' });
    }
    const p = await Product.findOne({
      _id: productId,
      userId: oid,
      active: true,
    }).lean();
    if (!p) {
      return sendJson(res, 400, { error: 'Produit introuvable ou inactif.' });
    }
    const unit = Math.abs(Number(p.price) || 0);
    const lineTotal = Math.round(unit * quantity * 100) / 100;
    total += lineTotal;
    lines.push({
      productId: p._id,
      name: p.name,
      unitPrice: unit,
      quantity,
      lineTotal,
    });
  }

  const order = await ShopOrder.create({
    merchantId: oid,
    customerName,
    customerPhone,
    notes,
    status: 'pending',
    items: lines,
    totalAmount: Math.round(total * 100) / 100,
  });
  sendJson(res, 201, { order: formatOrderDetail(order.toObject()) });
}

/**
 * PATCH /api/shop/:userId/orders/:orderId
 * Body: { status: 'confirmed' | 'delivered' | 'cancelled' }
 */
async function patchOrder(req, res) {
  const gate = await assertMerchant(req.params.userId);
  if (gate.error) {
    return sendJson(res, gate.error, { error: gate.msg });
  }
  const { orderId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    return sendJson(res, 400, { error: 'orderId invalide.' });
  }
  const nextStatus = String((req.body || {}).status || '').trim();
  if (!['confirmed', 'delivered', 'cancelled'].includes(nextStatus)) {
    return sendJson(res, 400, { error: 'Statut invalide.' });
  }

  const order = await ShopOrder.findOne({ _id: orderId, merchantId: gate.oid });
  if (!order) {
    return sendJson(res, 404, { error: 'Commande introuvable.' });
  }

  const prev = order.status;
  const allowed = ORDER_TRANSITIONS[prev] || [];
  if (!allowed.includes(nextStatus)) {
    return sendJson(res, 400, { error: 'Transition de statut non autorisée.' });
  }

  const { oid } = gate;

  if (nextStatus === 'confirmed' && prev === 'pending') {
    for (const line of order.items) {
      const updated = await Product.findOneAndUpdate(
        {
          _id: line.productId,
          userId: oid,
          stock: { $gte: line.quantity },
        },
        { $inc: { stock: -line.quantity } },
        { new: true }
      ).lean();
      if (!updated) {
        return sendJson(res, 409, {
          error: `Stock insuffisant pour « ${line.name} ».`,
        });
      }
    }

    const amount = Math.abs(Number(order.totalAmount) || 0);
    const tx = await Transaction.create({
      userId: oid,
      type: 'in',
      amount,
      title: `Vente · ${order.customerName}`,
      description: `Commande boutique ${order._id}`,
      category: 'Boutique',
      currency: 'XOF',
      shopOrderId: order._id,
    });
    order.incomeTransactionId = tx._id;
    order.confirmedAt = new Date();
  }

  if (nextStatus === 'cancelled' && prev === 'confirmed') {
    for (const line of order.items) {
      await Product.updateOne({ _id: line.productId, userId: oid }, { $inc: { stock: line.quantity } });
    }
    if (order.incomeTransactionId) {
      await Transaction.deleteOne({
        _id: order.incomeTransactionId,
        userId: oid,
        shopOrderId: order._id,
      });
      order.incomeTransactionId = null;
    }
    order.confirmedAt = null;
  }

  order.status = nextStatus;
  await order.save();
  sendJson(res, 200, { order: formatOrderDetail(order.toObject()) });
}

module.exports = {
  getShopSummary,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  listOrders,
  createOrder,
  patchOrder,
};
