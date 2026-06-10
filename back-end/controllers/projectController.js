const mongoose = require('mongoose');
const ProjectGoal = require('../models/ProjectGoal');
const { getExpectedCurrencyForUserId } = require('../utils/userCurrency');

function sendJson(res, status, data) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(data));
}

function parseObjectId(userId, res) {
  if (!userId) {
    sendJson(res, 400, { error: 'userId requis.' });
    return null;
  }
  const oid = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null;
  if (!oid) {
    sendJson(res, 400, { error: 'userId invalide.' });
    return null;
  }
  return oid;
}

function normalizeAutoCadence(raw) {
  const s = String(raw == null ? '' : raw).toLowerCase().trim();
  if (!s) return 'month';
  if (s === 'day' || s === 'daily' || s.includes('jour')) return 'day';
  if (s === 'week' || s === 'weekly' || s.includes('hebdo') || s.includes('semaine')) return 'week';
  return 'month';
}

function startOfUtcDay(d) {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function occurrencesSince(lastAt, now, cadence) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) return 0;
  if (cadence === 'day') {
    if (!lastAt) return 1;
    const diffDays = Math.floor((startOfUtcDay(now) - startOfUtcDay(lastAt)) / 86400000);
    return diffDays > 0 ? diffDays : 0;
  }
  if (cadence === 'week') {
    if (!lastAt) return 1;
    const diffDays = Math.floor((startOfUtcDay(now) - startOfUtcDay(lastAt)) / 86400000);
    const weeks = Math.floor(diffDays / 7);
    return weeks > 0 ? weeks : 0;
  }
  // month
  if (!lastAt) return 1;
  const months =
    (now.getUTCFullYear() - lastAt.getUTCFullYear()) * 12 +
    (now.getUTCMonth() - lastAt.getUTCMonth());
  return months > 0 ? months : 0;
}

async function applyScheduledAutoFill(doc, now = new Date()) {
  if (!doc || doc.autoEnabled !== true) return;
  const autoAmount = Math.max(0, Number(doc.autoAmount) || 0);
  if (autoAmount <= 0) return;
  const cadence = normalizeAutoCadence(doc.autoCadence);
  const times = occurrencesSince(doc.lastAutoFillAt || null, now, cadence);
  if (times <= 0) return;
  const current = Math.max(0, Number(doc.currentAmount) || 0);
  const target = Math.max(0, Number(doc.targetAmount) || 0);
  const next = Math.min(target, current + autoAmount * times);
  if (next !== current) {
    doc.currentAmount = next;
  }
  doc.lastAutoFillAt = now;
  await doc.save();
}

function formatProject(doc) {
  const target = Math.max(0, Number(doc.targetAmount) || 0);
  const current = Math.max(0, Number(doc.currentAmount) || 0);
  const capped = target > 0 ? Math.min(target, current) : current;
  const remaining = Math.max(0, target - capped);
  const progressPercent = target > 0 ? Math.min(100, Math.round((capped / target) * 100)) : 0;
  return {
    id: doc._id.toString(),
    title: doc.title,
    targetAmount: target,
    currentAmount: capped,
    remainingAmount: remaining,
    progressPercent,
    autoEnabled: doc.autoEnabled === true,
    autoAmount: Math.max(0, Number(doc.autoAmount) || 0),
    autoCadence: normalizeAutoCadence(doc.autoCadence),
    currency: doc.currency || 'XOF',
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
  };
}

async function listProjects(req, res) {
  const oid = parseObjectId(req.params.userId, res);
  if (!oid) return;
  const rows = await ProjectGoal.find({ userId: oid }).sort({ createdAt: -1 });
  for (const row of rows) {
    await applyScheduledAutoFill(row);
  }
  sendJson(res, 200, { projects: rows.map((r) => formatProject(r.toObject())) });
}

async function createProject(req, res) {
  const oid = parseObjectId(req.params.userId, res);
  if (!oid) return;
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  const title = String(body.title || '').trim();
  if (!title) return sendJson(res, 400, { error: 'title requis.' });

  const targetAmount = Number(body.targetAmount);
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    return sendJson(res, 400, { error: 'targetAmount doit être un nombre positif.' });
  }

  const autoEnabled = body.autoEnabled === true;
  const autoAmountRaw = Number(body.autoAmount);
  const autoAmount = Number.isFinite(autoAmountRaw) && autoAmountRaw > 0 ? autoAmountRaw : 0;
  const autoCadence = normalizeAutoCadence(body.autoCadence);
  const currencyInput = String(body.currency || '').trim().toUpperCase();
  const currency = currencyInput || (await getExpectedCurrencyForUserId(oid)) || 'XOF';

  const created = await ProjectGoal.create({
    userId: oid,
    title,
    targetAmount: Math.abs(targetAmount),
    currentAmount: 0,
    autoEnabled: autoEnabled && autoAmount > 0,
    autoAmount,
    autoCadence,
    lastAutoFillAt: null,
    currency,
  });
  const saved = await ProjectGoal.findById(created._id).lean();
  sendJson(res, 201, { project: formatProject(saved) });
}

async function patchProject(req, res) {
  const oid = parseObjectId(req.params.userId, res);
  if (!oid) return;
  const { projectId } = req.params;
  if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
    return sendJson(res, 400, { error: 'projectId invalide.' });
  }
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  const set = {};
  if (body.title != null) {
    const title = String(body.title).trim();
    if (!title) return sendJson(res, 400, { error: 'title invalide.' });
    set.title = title;
  }
  if (body.targetAmount != null) {
    const target = Number(body.targetAmount);
    if (!Number.isFinite(target) || target <= 0) {
      return sendJson(res, 400, { error: 'targetAmount invalide.' });
    }
    set.targetAmount = Math.abs(target);
  }
  if (body.autoEnabled != null) {
    set.autoEnabled = body.autoEnabled === true;
  }
  if (body.autoAmount != null) {
    const n = Number(body.autoAmount);
    if (!Number.isFinite(n) || n < 0) return sendJson(res, 400, { error: 'autoAmount invalide.' });
    set.autoAmount = Math.abs(n);
  }
  if (body.autoCadence != null) {
    set.autoCadence = normalizeAutoCadence(body.autoCadence);
  }
  if (Object.keys(set).length === 0) {
    return sendJson(res, 400, { error: 'Aucun champ à modifier.' });
  }

  if (set.autoEnabled === true && (set.autoAmount == null || set.autoAmount <= 0)) {
    return sendJson(res, 400, { error: 'autoAmount doit être > 0 quand autoEnabled est activé.' });
  }
  if (set.autoEnabled === false) {
    set.autoAmount = 0;
    set.lastAutoFillAt = null;
  }

  const updated = await ProjectGoal.findOneAndUpdate(
    { _id: projectId, userId: oid },
    { $set: set },
    { new: true, runValidators: true }
  ).lean();
  if (!updated) return sendJson(res, 404, { error: 'Projet introuvable.' });
  sendJson(res, 200, { project: formatProject(updated) });
}

async function addContribution(req, res) {
  const oid = parseObjectId(req.params.userId, res);
  if (!oid) return;
  const { projectId } = req.params;
  if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
    return sendJson(res, 400, { error: 'projectId invalide.' });
  }
  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return sendJson(res, 400, { error: 'amount doit être un nombre positif.' });
  }

  const doc = await ProjectGoal.findOne({ _id: projectId, userId: oid });
  if (!doc) return sendJson(res, 404, { error: 'Projet introuvable.' });

  doc.currentAmount = Math.min(doc.targetAmount, Math.max(0, Number(doc.currentAmount) || 0) + Math.abs(amount));
  await doc.save();
  sendJson(res, 200, { project: formatProject(doc.toObject()) });
}

async function applyAutoFill(req, res) {
  const oid = parseObjectId(req.params.userId, res);
  if (!oid) return;
  const { projectId } = req.params;
  if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
    return sendJson(res, 400, { error: 'projectId invalide.' });
  }
  const doc = await ProjectGoal.findOne({ _id: projectId, userId: oid });
  if (!doc) return sendJson(res, 404, { error: 'Projet introuvable.' });
  if (!doc.autoEnabled || Number(doc.autoAmount) <= 0) {
    return sendJson(res, 400, { error: 'Remplissage automatique non configuré.' });
  }
  doc.currentAmount = Math.min(
    doc.targetAmount,
    Math.max(0, Number(doc.currentAmount) || 0) + Math.abs(Number(doc.autoAmount) || 0)
  );
  await doc.save();
  sendJson(res, 200, { project: formatProject(doc.toObject()) });
}

async function deleteProject(req, res) {
  const oid = parseObjectId(req.params.userId, res);
  if (!oid) return;
  const { projectId } = req.params;
  if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
    return sendJson(res, 400, { error: 'projectId invalide.' });
  }
  const result = await ProjectGoal.deleteOne({ _id: projectId, userId: oid });
  if (result.deletedCount === 0) {
    return sendJson(res, 404, { error: 'Projet introuvable.' });
  }
  sendJson(res, 200, { ok: true });
}

module.exports = {
  listProjects,
  createProject,
  patchProject,
  addContribution,
  applyAutoFill,
  deleteProject,
};
