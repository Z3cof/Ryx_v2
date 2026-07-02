const mongoose = require('mongoose');
const RecurringRule = require('../models/RecurringRule');
const { getExpectedCurrencyForUserId } = require('../utils/userCurrency');
const { ensureRecurringForUserMonth } = require('../services/recurringEnsure');
const { normalizeCadence } = require('../utils/recurringCadence');

function pickCadenceRaw(body) {
  if (!body || typeof body !== 'object') return undefined;

  const keys = ['cadence', 'cadenceType', 'repeat', 'repetition', 'frequency', 'interval'];
  for (const k of keys) {
    const v = body[k];
    if (typeof v === 'string' || typeof v === 'number') return v;
    if (v && typeof v === 'object') {
      const nested = pickCadenceRaw(v);
      if (nested != null) return nested;
    }
  }

  for (const [k, v] of Object.entries(body)) {
    const lk = String(k).toLowerCase();
    if (lk.includes('cadence') || lk.includes('repeat') || lk.includes('frequency') || lk.includes('interval')) {
      if (typeof v === 'string' || typeof v === 'number') return v;
      if (v && typeof v === 'object') {
        const nested = pickCadenceRaw(v);
        if (nested != null) return nested;
      }
    }
  }
  return undefined;
}


function parseObjectId(userId, res) {
  if (!userId) {
    res.status(400).json({ error: 'userId requis.' });
    return null;
  }
  const oid = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null;
  if (!oid) {
    res.status(400).json({ error: 'userId invalide.' });
    return null;
  }
  return oid;
}

function formatRule(doc) {
  const rawCadence =
    doc.cadence ??
    doc.cadenceType ??
    doc.repeat ??
    doc.repetition ??
    doc.frequency ??
    doc.interval;
  const c = normalizeCadence(rawCadence);
  return {
    id: doc._id.toString(),
    type: doc.type,
    title: doc.title,
    amount: Math.abs(Number(doc.amount) || 0),
    category: doc.category || (doc.type === 'in' ? 'Autre' : 'Autre'),
    currency: doc.currency || 'XOF',
    cadence: c,
    isActive: doc.isActive !== false,
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : null,
  };
}

/**
 * GET /api/recurring/:userId
 */
async function listRules(req, res) {
  const oid = parseObjectId(req.params.userId, res);
  if (!oid) return;

  const rules = await RecurringRule.find({ userId: oid, isActive: true }).sort({ createdAt: -1 }).lean();
  res.status(200).json({ rules: rules.map(formatRule) });
}

/**
 * POST /api/recurring/:userId
 * Body: { type: 'in'|'out', title, amount (>0), category?, currency? }
 */
async function createRule(req, res) {
  const oid = parseObjectId(req.params.userId, res);
  if (!oid) return;

  const rawBody = req.body;
  const body =
    rawBody != null && typeof rawBody === 'object' && !Array.isArray(rawBody) ? rawBody : {};
  const { type, title, amount, category, currency: rawCurrency } = body;
  const rawCadence = pickCadenceRaw(body);
  if (type !== 'in' && type !== 'out') {
    return res.status(400).json({ error: 'type doit être in ou out.' });
  }
  const t = String(title || '').trim();
  if (!t) {
    return res.status(400).json({ error: 'title requis.' });
  }
  const num = Number(amount);
  if (Number.isNaN(num) || num <= 0) {
    return res.status(400).json({ error: 'amount doit être un nombre positif.' });
  }

  const defaultCur = await getExpectedCurrencyForUserId(oid);
  const currency = String(rawCurrency || defaultCur).trim() || defaultCur;

  const cadence = normalizeCadence(rawCadence);
  console.log('[recurring:create] payload', {
    userId: oid.toString(),
    type,
    title: String(title || ''),
    rawCadence,
    parsedCadence: cadence,
    bodyKeys: Object.keys(body || {}),
  });

  const doc = await RecurringRule.create({
    userId: oid,
    type,
    title: t,
    amount: Math.abs(num),
    category: String(category || 'Autre').trim() || 'Autre',
    currency,
    cadence,
    isActive: true,
  });

  const saved = await RecurringRule.findById(doc._id).lean();
  if (!saved) {
    return res.status(500).json({ error: 'Erreur persistance de la règle.' });
  }
  console.log('[recurring:create] saved', {
    id: saved._id.toString(),
    cadence: saved.cadence,
    type: saved.type,
    title: saved.title,
  });
  res.status(201).json({ rule: formatRule(saved) });
}

/**
 * PATCH /api/recurring/:userId/:ruleId
 * Body partiel: { cadence?: 'day'|'week'|'month', amount?: number (>0) }
 */
async function patchRule(req, res) {
  const oid = parseObjectId(req.params.userId, res);
  if (!oid) return;

  const { ruleId } = req.params;
  if (!ruleId || !mongoose.Types.ObjectId.isValid(ruleId)) {
    return res.status(400).json({ error: 'ruleId invalide.' });
  }

  const rawBody = req.body;
  const body =
    rawBody != null && typeof rawBody === 'object' && !Array.isArray(rawBody) ? rawBody : {};
  const rawCadence = pickCadenceRaw(body);
  const hasAmount = body.amount != null && body.amount !== '';
  if (rawCadence == null && !hasAmount) {
    return res.status(400).json({ error: 'Aucun champ à modifier (cadence ou amount).' });
  }

  const updateSet = {};
  if (rawCadence != null) {
    updateSet.cadence = normalizeCadence(rawCadence);
  }
  if (hasAmount) {
    const num = Number(body.amount);
    if (!Number.isFinite(num) || num <= 0) {
      return res.status(400).json({ error: 'amount doit être un nombre positif.' });
    }
    updateSet.amount = Math.abs(num);
  }

  const updated = await RecurringRule.findOneAndUpdate(
    { _id: ruleId, userId: oid },
    { $set: updateSet },
    { new: true, runValidators: true }
  ).lean();

  if (!updated) {
    return res.status(404).json({ error: 'Règle introuvable.' });
  }
  res.status(200).json({ rule: formatRule(updated) });
}

/**
 * DELETE /api/recurring/:userId/:ruleId
 */
async function deleteRule(req, res) {
  const oid = parseObjectId(req.params.userId, res);
  if (!oid) return;

  const { ruleId } = req.params;
  if (!ruleId || !mongoose.Types.ObjectId.isValid(ruleId)) {
    return res.status(400).json({ error: 'ruleId invalide.' });
  }

  const result = await RecurringRule.deleteOne({ _id: ruleId, userId: oid });
  if (result.deletedCount === 0) {
    return res.status(404).json({ error: 'Règle introuvable.' });
  }
  res.status(200).json({ ok: true });
}

/**
 * POST /api/recurring/:userId/ensure-month
 * Body: { year, month } — crée les transactions manquantes pour ce mois (mois futur ignoré).
 */
async function ensureMonth(req, res) {
  const oid = parseObjectId(req.params.userId, res);
  if (!oid) return;

  const year = parseInt(req.body.year, 10);
  const month = parseInt(req.body.month, 10);
  const y = Number.isNaN(year) ? new Date().getFullYear() : year;
  const m = Number.isNaN(month) ? new Date().getMonth() + 1 : month;
  if (m < 1 || m > 12) {
    return res.status(400).json({ error: 'Mois invalide.' });
  }

  const now = new Date();
  const currentY = now.getFullYear();
  const currentM = now.getMonth() + 1;
  const isFuture = y > currentY || (y === currentY && m > currentM);
  if (isFuture) {
    return res.status(200).json({ created: [], createdCount: 0, skipped: 'future_month' });
  }

  const result = await ensureRecurringForUserMonth(oid, y, m);
  const body = { created: result.createdIds, createdCount: result.createdCount };
  if (result.skipped) body.skipped = result.skipped;
  res.status(200).json(body);
}

module.exports = {
  listRules,
  createRule,
  patchRule,
  deleteRule,
  ensureMonth,
};
