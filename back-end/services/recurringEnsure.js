/**
 * Matérialise les transactions récurrentes pour un mois (jour / semaine / mois).
 * Utilisé par POST /recurring/.../ensure-month et par les lectures dépenses / revenus du mois.
 */
const RecurringRule = require('../models/RecurringRule');
const Transaction = require('../models/Transaction');
const { normalizeCadence } = require('../utils/recurringCadence');

function monthBounds(y, m) {
  const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const end = new Date(y, m, 0, 23, 59, 59, 999);
  return { start, end };
}

function slotsForMonthCadence(y, m) {
  const { start, end } = monthBounds(y, m);
  return [{ start, end }];
}

function slotsForDayCadence(y, m) {
  const { end } = monthBounds(y, m);
  const last = end.getDate();
  const slots = [];
  for (let d = 1; d <= last; d += 1) {
    const start = new Date(y, m - 1, d, 0, 0, 0, 0);
    const slotEnd = new Date(y, m - 1, d, 23, 59, 59, 999);
    slots.push({ start, end: slotEnd });
  }
  return slots;
}

function slotsForWeekCadence(y, m) {
  const monthStart = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const monthEnd = new Date(y, m, 0, 23, 59, 59, 999);
  const slots = [];
  let monday = new Date(monthStart);
  const dow = monday.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  monday.setDate(monday.getDate() + offset);
  monday.setHours(0, 0, 0, 0);
  while (monday <= monthEnd) {
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    const slotStart = monday < monthStart ? new Date(monthStart) : new Date(monday);
    const slotEnd = sunday > monthEnd ? new Date(monthEnd) : new Date(sunday);
    if (slotStart <= slotEnd) {
      slots.push({ start: slotStart, end: slotEnd });
    }
    monday.setDate(monday.getDate() + 7);
  }
  return slots;
}

function slotsForCadence(cadence, y, m) {
  if (cadence === 'day') return slotsForDayCadence(y, m);
  if (cadence === 'week') return slotsForWeekCadence(y, m);
  return slotsForMonthCadence(y, m);
}

/**
 * @param {import('mongoose').Types.ObjectId} userIdOid
 * @param {number} y année (ex. 2025)
 * @param {number} m mois 1–12
 * @returns {Promise<{ createdIds: string[]; createdCount: number; skipped?: string }>}
 */
async function ensureRecurringForUserMonth(userIdOid, y, m) {
  if (m < 1 || m > 12) {
    return { createdIds: [], createdCount: 0, skipped: 'invalid_month' };
  }

  const now = new Date();
  const currentY = now.getFullYear();
  const currentM = now.getMonth() + 1;
  const isFuture = y > currentY || (y === currentY && m > currentM);
  if (isFuture) {
    return { createdIds: [], createdCount: 0, skipped: 'future_month' };
  }

  const rules = await RecurringRule.find({ userId: userIdOid, isActive: true }).lean();
  const createdIds = [];
  const col = Transaction.collection;

  for (const rule of rules) {
    const ruleOid = rule._id;
    const cadence = normalizeCadence(rule.cadence);
    const slots = slotsForCadence(cadence, y, m);

    const absAmt = Math.abs(Number(rule.amount) || 0);
    const signed = rule.type === 'out' ? -absAmt : absAmt;

    for (const slot of slots) {
      const existing = await Transaction.findOne({
        userId: userIdOid,
        recurringRuleId: ruleOid,
        createdAt: { $gte: slot.start, $lte: slot.end },
      })
        .select('_id')
        .lean();
      if (existing) continue;

      if (cadence === 'month') {
        const { start, end } = monthBounds(y, m);
        const manualSibling = await Transaction.findOne({
          userId: userIdOid,
          type: rule.type,
          category: rule.category || 'Autre',
          title: rule.title,
          amount: signed,
          createdAt: { $gte: start, $lte: end },
          $or: [{ recurringRuleId: null }, { recurringRuleId: { $exists: false } }],
        })
          .select('_id')
          .lean();
        if (manualSibling) {
          await Transaction.updateOne({ _id: manualSibling._id }, { $set: { recurringRuleId: ruleOid } });
          continue;
        }
      }

      let booking;
      if (cadence === 'month') {
        const dom = Math.min(3, new Date(y, m, 0).getDate());
        booking = new Date(y, m - 1, dom, 10, 0, 0, 0);
      } else {
        booking = new Date(slot.start);
        booking.setHours(10, 0, 0, 0);
        if (booking.getTime() < slot.start.getTime()) booking = new Date(slot.start);
        if (booking.getTime() > slot.end.getTime()) booking = new Date(slot.end);
      }

      const insertDoc = {
        userId: userIdOid,
        title: rule.title,
        description: '',
        amount: signed,
        currency: rule.currency || 'XOF',
        type: rule.type,
        category: rule.category || 'Autre',
        recurringRuleId: ruleOid,
        createdAt: booking,
        updatedAt: booking,
      };

      const ins = await col.insertOne(insertDoc);
      createdIds.push(ins.insertedId.toString());
    }
  }

  return { createdIds, createdCount: createdIds.length };
}

module.exports = {
  ensureRecurringForUserMonth,
  monthBounds,
  slotsForCadence,
  normalizeCadence,
};
