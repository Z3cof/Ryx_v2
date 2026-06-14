import { apiFetch } from './apiFetch';
import {
  loadRecurringExpenseTemplates,
  loadRecurringIncomeTemplates,
  saveRecurringExpenseTemplates,
  saveRecurringIncomeTemplates,
  type RecurringCadence,
} from './recurringTemplatesStorage';

export type { RecurringCadence } from './recurringTemplatesStorage';

export type RecurringRuleDto = {
  id: string;
  type: 'in' | 'out';
  title: string;
  amount: number;
  category: string;
  currency?: string;
  cadence?: RecurringCadence;
  isActive?: boolean;
  createdAt?: string | null;
};

export type CreateRecurringRulePayload = {
  type: 'in' | 'out';
  title: string;
  amount: number;
  category: string;
  currency?: string;
  cadence?: RecurringCadence;
};

/** Même logique que `back-end/utils/recurringCadence.js` (affichage / fusion client). */
function normalizeRuleCadence(raw: unknown): RecurringCadence {
  const s = String(raw == null ? '' : raw)
    .toLowerCase()
    .trim()
    .replace(/[\u200b-\u200d\ufeff\u2060]/g, '');
  const compact = s.replace(/[\s_\-]+/g, '');
  if (!compact) return 'month';
  if (
    compact === 'day' ||
    compact === 'daily' ||
    compact === 'jour' ||
    compact === 'd' ||
    compact === 'quotidien' ||
    compact.includes('day') ||
    compact.includes('jour') ||
    compact.includes('quotid')
  ) {
    return 'day';
  }
  if (
    compact === 'week' ||
    compact === 'weekly' ||
    compact === 'hebdo' ||
    compact === 'hebdomadaire' ||
    compact === 'semaine' ||
    compact === 'w' ||
    compact === 'parsemaine' ||
    compact.includes('week') ||
    compact.includes('semaine') ||
    compact.includes('hebdo')
  ) {
    return 'week';
  }
  if (
    compact === 'month' ||
    compact === 'monthly' ||
    compact === 'mois' ||
    compact === 'mensuel' ||
    compact === 'm' ||
    compact === 'parmois' ||
    compact.includes('month') ||
    compact.includes('mois') ||
    compact.includes('mens')
  ) {
    return 'month';
  }
  return 'month';
}

function extractRuleCadenceRaw(rule: RecurringRuleDto & Record<string, unknown>): unknown {
  return (
    rule.cadence ??
    rule.cadenceType ??
    rule.repeat ??
    rule.repetition ??
    rule.frequency ??
    rule.interval
  );
}

export async function fetchRecurringRules(userId: string): Promise<RecurringRuleDto[]> {
  const res = await apiFetch(`/api/recurring/${encodeURIComponent(userId)}`, {
    method: 'GET',
  });
  const text = await res.text();
  if (!res.ok) {
    const data = text ? JSON.parse(text) : {};
    throw new Error((data as { error?: string }).error || `Erreur ${res.status}`);
  }
  const data = JSON.parse(text || '{}') as { rules?: RecurringRuleDto[] };
  const rules = data.rules ?? [];
  return rules.map((r) => ({
    ...r,
    cadence: normalizeRuleCadence(extractRuleCadenceRaw(r as RecurringRuleDto & Record<string, unknown>)),
  }));
}

export async function createRecurringRule(
  userId: string,
  payload: CreateRecurringRulePayload
): Promise<RecurringRuleDto> {
  const outboundCadence = payload.cadence ?? 'month';
  console.log('[recurring:create] request', {
    userId,
    type: payload.type,
    title: payload.title,
    cadence: outboundCadence,
  });
  const res = await apiFetch(`/api/recurring/${encodeURIComponent(userId)}`, {
    method: 'POST',
    body: JSON.stringify({
      type: payload.type,
      title: payload.title.trim(),
      amount: payload.amount,
      category: payload.category,
      currency: payload.currency ?? 'XOF',
      cadence: outboundCadence,
      cadenceType: outboundCadence,
      repeat: outboundCadence,
      frequency: outboundCadence,
      interval: outboundCadence,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    const data = text ? JSON.parse(text) : {};
    throw new Error((data as { error?: string }).error || `Erreur ${res.status}`);
  }
  const data = JSON.parse(text || '{}') as { rule?: RecurringRuleDto };
  const rule = data.rule;
  if (!rule) {
    throw new Error('Réponse serveur invalide (règle manquante).');
  }
  const extractedRaw = extractRuleCadenceRaw(rule as RecurringRuleDto & Record<string, unknown>);
  const normalized =
    extractedRaw == null ? outboundCadence : normalizeRuleCadence(extractedRaw);
  console.log('[recurring:create] response', {
    id: rule.id,
    cadenceRaw: extractedRaw,
    cadenceNormalized: normalized,
  });
  return { ...rule, cadence: normalized };
}

export type PatchRecurringRulePayload = {
  cadence?: RecurringCadence;
  amount?: number;
};

export async function patchRecurringRule(
  userId: string,
  ruleId: string,
  payload: PatchRecurringRulePayload
): Promise<RecurringRuleDto> {
  const cadence = payload.cadence;
  const amount = payload.amount;
  if (cadence == null && amount == null) {
    throw new Error('Aucun champ à modifier.');
  }
  const res = await apiFetch(
    `/api/recurring/${encodeURIComponent(userId)}/${encodeURIComponent(ruleId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        ...(cadence != null
          ? {
              cadence,
              cadenceType: cadence,
              repeat: cadence,
              frequency: cadence,
              interval: cadence,
            }
          : {}),
        ...(amount != null ? { amount } : {}),
      }),
    }
  );
  const text = await res.text();
  if (!res.ok) {
    const data = text ? JSON.parse(text) : {};
    throw new Error((data as { error?: string }).error || `Erreur ${res.status}`);
  }
  const data = JSON.parse(text || '{}') as { rule?: RecurringRuleDto };
  const rule = data.rule;
  if (!rule) {
    throw new Error('Réponse serveur invalide (règle manquante).');
  }
  return { ...rule, cadence: normalizeRuleCadence(rule.cadence) };
}

export async function deleteRecurringRule(userId: string, ruleId: string): Promise<void> {
  const res = await apiFetch(
    `/api/recurring/${encodeURIComponent(userId)}/${encodeURIComponent(ruleId)}`,
    { method: 'DELETE' }
  );
  const text = await res.text();
  if (!res.ok) {
    const data = text ? JSON.parse(text) : {};
    throw new Error((data as { error?: string }).error || `Erreur ${res.status}`);
  }
}

export type EnsureMonthResult = {
  created: string[];
  createdCount: number;
  skipped?: string;
};

export async function ensureRecurringMonth(
  userId: string,
  year: number,
  month: number
): Promise<EnsureMonthResult> {
  const res = await apiFetch(`/api/recurring/${encodeURIComponent(userId)}/ensure-month`, {
    method: 'POST',
    body: JSON.stringify({ year, month }),
  });
  const text = await res.text();
  if (!res.ok) {
    const data = text ? JSON.parse(text) : {};
    throw new Error((data as { error?: string }).error || `Erreur ${res.status}`);
  }
  return JSON.parse(text || '{}') as EnsureMonthResult;
}

/**
 * Si l’API n’a aucune règle mais AsyncStorage contient encore des modèles (ancien flux), les pousse puis vide le stockage local.
 */
export async function migrateLocalRecurringTemplatesIfNeeded(userId: string): Promise<void> {
  let remote: RecurringRuleDto[] = [];
  try {
    remote = await fetchRecurringRules(userId);
  } catch {
    return;
  }
  if (remote.length > 0) return;

  const [localIn, localOut] = await Promise.all([
    loadRecurringIncomeTemplates(userId),
    loadRecurringExpenseTemplates(userId),
  ]);
  if (localIn.length === 0 && localOut.length === 0) return;

  try {
    for (const row of localIn) {
      await createRecurringRule(userId, {
        type: 'in',
        title: row.title,
        amount: row.amount,
        category: row.category,
        cadence: row.cadence ?? 'month',
      });
    }
    for (const row of localOut) {
      await createRecurringRule(userId, {
        type: 'out',
        title: row.title,
        amount: row.amount,
        category: row.category,
        cadence: row.cadence ?? 'month',
      });
    }
    await saveRecurringIncomeTemplates(userId, []);
    await saveRecurringExpenseTemplates(userId, []);
  } catch {
    // garde le local si le réseau échoue au milieu de la migration
  }
}
