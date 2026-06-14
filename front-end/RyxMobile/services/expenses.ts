import { apiFetch } from './apiFetch';
import {
  cacheData,
  getCachedData,
  getExpensesCacheKey,
  getIncomeCacheKey,
  getSummaryCacheKey,
  savePendingTransaction,
  getPendingTransactions,
  removePendingTransaction,
} from './offlineStorage';

export type ExpensesSummary = {
  currentMonthTotal: number;
  currentYearTotal: number;
  monthlyBreakdown: {
    year: number;
    month: number;
    monthLabel: string;
    total: number;
    count: number;
  }[];
};

export type ExpenseItem = {
  id: string;
  title: string;
  desc: string;
  amount: string;
  amountValue?: number;
  currency?: string;
  createdAtIso?: string | null;
  date: string;
  type: string;
  category?: string;
};

export type ExpensesByMonth = {
  year: number;
  month: number;
  monthLabel: string;
  expenses: ExpenseItem[];
  total: number;
};

export type IncomeItem = {
  id: string;
  title: string;
  desc: string;
  amount: string;
  amountValue?: number;
  currency?: string;
  createdAtIso?: string | null;
  date: string;
  type: string;
  category?: string;
};

export type IncomeByMonth = {
  year: number;
  month: number;
  monthLabel: string;
  income: IncomeItem[];
  total: number;
};

export async function fetchExpensesSummary(userId: string): Promise<ExpensesSummary> {
  const cacheKey = getSummaryCacheKey(userId);
  try {
    const res = await apiFetch(`/api/expenses/summary/${encodeURIComponent(userId)}`, {
      method: 'GET',
    });
    const text = await res.text();
    if (!res.ok) {
      const data = text ? JSON.parse(text) : {};
      throw new Error((data as { error?: string }).error || `Erreur ${res.status}`);
    }
    const parsed = JSON.parse(text || '{}') as ExpensesSummary;
    await cacheData(cacheKey, parsed);
    return parsed;
  } catch (err) {
    const cached = await getCachedData<ExpensesSummary>(cacheKey);
    if (cached) {
      return cached;
    }
    throw err;
  }
}

export async function fetchExpensesByMonth(
  userId: string,
  year: number,
  month: number
): Promise<ExpensesByMonth> {
  const cacheKey = getExpensesCacheKey(userId, year, month);
  try {
    const params = new URLSearchParams({ year: String(year), month: String(month) });
    const res = await apiFetch(`/api/expenses/${encodeURIComponent(userId)}?${params}`, {
      method: 'GET',
    });
    const text = await res.text();
    if (!res.ok) {
      const data = text ? JSON.parse(text) : {};
      throw new Error((data as { error?: string }).error || `Erreur ${res.status}`);
    }
    const parsed = JSON.parse(text || '{}') as ExpensesByMonth;
    await cacheData(cacheKey, parsed);
    return parsed;
  } catch (err) {
    const cached = await getCachedData<ExpensesByMonth>(cacheKey);
    if (cached) {
      return cached;
    }
    throw err;
  }
}

export async function fetchIncomeByMonth(
  userId: string,
  year: number,
  month: number
): Promise<IncomeByMonth> {
  const cacheKey = getIncomeCacheKey(userId, year, month);
  try {
    const params = new URLSearchParams({ year: String(year), month: String(month) });
    const res = await apiFetch(`/api/expenses/income/${encodeURIComponent(userId)}?${params}`, {
      method: 'GET',
    });
    const text = await res.text();
    if (!res.ok) {
      const data = text ? JSON.parse(text) : {};
      throw new Error((data as { error?: string }).error || `Erreur ${res.status}`);
    }
    const parsed = JSON.parse(text || '{}') as IncomeByMonth;
    await cacheData(cacheKey, parsed);
    return parsed;
  } catch (err) {
    const cached = await getCachedData<IncomeByMonth>(cacheKey);
    if (cached) {
      return cached;
    }
    throw err;
  }
}

/** Seuil du mois (à ne pas dépasser) — utilisé pour le modèle IA */
export type MonthThreshold = {
  year: number;
  month: number;
  amount: number | null;
  currency: string;
};

export async function fetchThreshold(
  userId: string,
  year: number,
  month: number
): Promise<MonthThreshold> {
  const params = new URLSearchParams({ year: String(year), month: String(month) });
  const res = await apiFetch(`/api/expenses/threshold/${encodeURIComponent(userId)}?${params}`, {
    method: 'GET',
  });
  const text = await res.text();
  if (!res.ok) {
    const data = text ? JSON.parse(text) : {};
    throw new Error((data as { error?: string }).error || `Erreur ${res.status}`);
  }
  return JSON.parse(text || '{}') as MonthThreshold;
}

export async function setThreshold(
  userId: string,
  year: number,
  month: number,
  amount: number,
  currency?: string
): Promise<MonthThreshold> {
  const res = await apiFetch(`/api/expenses/threshold/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    body: JSON.stringify({ year, month, amount, currency: currency || 'XOF' }),
  });
  const text = await res.text();
  if (!res.ok) {
    const data = text ? JSON.parse(text) : {};
    throw new Error((data as { error?: string }).error || `Erreur ${res.status}`);
  }
  return JSON.parse(text || '{}') as MonthThreshold;
}

/** Jour civil local au format YYYY-MM-DD (API transactions). */
export function toTransactionDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export type CreateExpensePayload = {
  title: string;
  amount: number;
  category: string;
  description?: string;
  currency?: string;
  /** YYYY-MM-DD, jour affiché à l’utilisateur (local). */
  date?: string;
};

export async function createExpense(
  userId: string,
  payload: CreateExpensePayload
): Promise<{ offline: boolean }> {
  try {
    const res = await apiFetch('/api/transactions', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        type: 'out',
        title: payload.title.trim(),
        amount: payload.amount,
        category: payload.category || 'Autre',
        description: payload.description?.trim() ?? '',
        currency: payload.currency ?? 'XOF',
        ...(payload.date ? { date: payload.date } : {}),
      }),
    });
    const text = await res.text();
    if (!res.ok) {
      const data = text ? JSON.parse(text) : {};
      throw new Error((data as { error?: string }).error || `Erreur ${res.status}`);
    }
    return { offline: false };
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message.includes('Network') ||
        err.message.includes('fetch') ||
        err.message.includes('abort') ||
        err.message.includes('timeout') ||
        err.message.includes('unreachable') ||
        err.message.includes('ECONNREFUSED'))
    ) {
      console.log('[Offline] Network error detected. Saving expense locally.');
      await savePendingTransaction(userId, {
        userId,
        type: 'out',
        title: payload.title.trim(),
        amount: payload.amount,
        category: payload.category || 'Autre',
        description: payload.description?.trim() ?? '',
        currency: payload.currency ?? 'XOF',
        date: payload.date ?? toTransactionDateOnly(new Date()),
      });
      return { offline: true };
    }
    throw err;
  }
}

export type CreateIncomePayload = {
  title: string;
  amount: number;
  category: string;
  description?: string;
  currency?: string;
  date?: string;
};

export async function createIncome(
  userId: string,
  payload: CreateIncomePayload
): Promise<{ offline: boolean }> {
  try {
    const res = await apiFetch('/api/transactions', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        type: 'in',
        title: payload.title.trim(),
        amount: payload.amount,
        category: payload.category || 'Autre',
        description: payload.description?.trim() ?? '',
        currency: payload.currency ?? 'XOF',
        ...(payload.date ? { date: payload.date } : {}),
      }),
    });
    const text = await res.text();
    if (!res.ok) {
      const data = text ? JSON.parse(text) : {};
      throw new Error((data as { error?: string }).error || `Erreur ${res.status}`);
    }
    return { offline: false };
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message.includes('Network') ||
        err.message.includes('fetch') ||
        err.message.includes('abort') ||
        err.message.includes('timeout') ||
        err.message.includes('unreachable') ||
        err.message.includes('ECONNREFUSED'))
    ) {
      console.log('[Offline] Network error detected. Saving income locally.');
      await savePendingTransaction(userId, {
        userId,
        type: 'in',
        title: payload.title.trim(),
        amount: payload.amount,
        category: payload.category || 'Autre',
        description: payload.description?.trim() ?? '',
        currency: payload.currency ?? 'XOF',
        date: payload.date ?? toTransactionDateOnly(new Date()),
      });
      return { offline: true };
    }
    throw err;
  }
}

export async function syncPendingTransactions(
  userId: string
): Promise<{ syncedCount: number; errors: any[] }> {
  const pending = await getPendingTransactions(userId);
  if (pending.length === 0) return { syncedCount: 0, errors: [] };

  let syncedCount = 0;
  const errors: any[] = [];

  for (const tx of pending) {
    try {
      const res = await apiFetch('/api/transactions', {
        method: 'POST',
        body: JSON.stringify({
          userId: tx.userId,
          type: tx.type,
          title: tx.title,
          amount: tx.amount,
          category: tx.category,
          description: tx.description,
          currency: tx.currency,
          date: tx.date,
        }),
      });
      const text = await res.text();
      if (!res.ok) {
        const data = text ? JSON.parse(text) : {};
        throw new Error((data as { error?: string }).error || `Erreur ${res.status}`);
      }

      await removePendingTransaction(userId, tx.tempId);
      syncedCount++;
    } catch (err) {
      console.error(`[Offline Sync] Failed to sync transaction:`, tx, err);
      errors.push(err);
      break; // stop on network issues
    }
  }

  return { syncedCount, errors };
}

export type UpdateTransactionPayload = {
  title?: string;
  amount?: number;
  category?: string;
  description?: string;
  currency?: string;
  date?: string;
};

export async function updateTransaction(
  transactionId: string,
  payload: UpdateTransactionPayload
): Promise<void> {
  const res = await apiFetch(`/api/transactions/${encodeURIComponent(transactionId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    const data = text ? JSON.parse(text) : {};
    throw new Error((data as { error?: string }).error || `Erreur ${res.status}`);
  }
}

export async function deleteTransaction(transactionId: string): Promise<void> {
  const res = await apiFetch(`/api/transactions/${encodeURIComponent(transactionId)}`, {
    method: 'DELETE',
  });
  const text = await res.text();
  if (!res.ok) {
    const data = text ? JSON.parse(text) : {};
    throw new Error((data as { error?: string }).error || `Erreur ${res.status}`);
  }
}

/** Catégories de dépenses (id = valeur envoyée au backend ; labelKey = clé i18n) */
export const EXPENSE_CATEGORIES = [
  { id: 'Alimentation', labelKey: 'depenses.cat.alimentation', icon: 'restaurant' as const },
  { id: 'Transport', labelKey: 'depenses.cat.transport', icon: 'car' as const },
  { id: 'Logement', labelKey: 'depenses.cat.logement', icon: 'home' as const },
  { id: 'Santé', labelKey: 'depenses.cat.sante', icon: 'medkit' as const },
  { id: 'Loisirs', labelKey: 'depenses.cat.loisirs', icon: 'game-controller' as const },
  { id: 'Shopping', labelKey: 'depenses.cat.shopping', icon: 'cart' as const },
  { id: 'Éducation', labelKey: 'depenses.cat.education', icon: 'school' as const },
  { id: 'Autre', labelKey: 'depenses.cat.autre', icon: 'ellipsis-horizontal' as const },
] as const;

/** Catégories d’entrées (revenus) — id = valeur stockée côté API */
export const INCOME_CATEGORIES = [
  { id: 'Salaire', labelKey: 'depenses.incomeCat.salaire', icon: 'briefcase' as const },
  { id: 'Freelance', labelKey: 'depenses.incomeCat.freelance', icon: 'laptop-outline' as const },
  { id: 'Investissement', labelKey: 'depenses.incomeCat.investissement', icon: 'trending-up' as const },
  { id: 'Cadeau', labelKey: 'depenses.incomeCat.cadeau', icon: 'gift' as const },
  { id: 'Vente', labelKey: 'depenses.incomeCat.vente', icon: 'storefront-outline' as const },
  { id: 'Remboursement', labelKey: 'depenses.incomeCat.remboursement', icon: 'swap-horizontal' as const },
  { id: 'Autre', labelKey: 'depenses.incomeCat.autre', icon: 'ellipsis-horizontal' as const },
] as const;
