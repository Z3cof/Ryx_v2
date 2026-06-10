/**
 * Cadence stockée en base : `day` | `week` | `month`.
 * Tolère variantes / espaces / caractères invisibles (copier-coller, anciennes données).
 */
function normalizeCadence(raw) {
  const s = String(raw == null ? '' : raw)
    .toLowerCase()
    .trim()
    .replace(/[\u200b-\u200d\ufeff\u2060]/g, '');

  if (s === 'day' || s === 'daily' || s === 'jour' || s === 'd' || s === 'quotidien') return 'day';
  if (
    s === 'week' ||
    s === 'weekly' ||
    s === 'hebdo' ||
    s === 'hebdomadaire' ||
    s === 'semaine' ||
    s === 'w' ||
    s === 'par semaine'
  ) {
    return 'week';
  }
  if (s === 'month' || s === 'monthly' || s === 'mois' || s === 'mensuel' || s === 'm' || s === 'par mois') {
    return 'month';
  }
  return 'month';
}

module.exports = { normalizeCadence };
