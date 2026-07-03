import { apiFetch } from './apiFetch';
import { cacheData, getCachedData, getDashboardCacheKey } from './offlineStorage';

export type DashboardData = {
  user: { name: string; email: string; avatar?: string; countryIso?: string };
  balance: number;
  currency: string;
  /** Revenus (entrées) du mois civil courant — aligné liste Dépenses / Entrées pour ce mois. */
  totalRevenus: number;
  /** Dépenses du mois civil courant. */
  totalDepenses: number;
  /** Entrées − sorties sur le mois courant (hors mode « solde mensuel » défini par l’utilisateur). */
  soldeDisponible: number;
  /** Dépenses du mois en cours (pour calcul solde quand solde mensuel défini) */
  currentMonthExpenses?: number;
  wallets: { currency: string; balance: number }[];
  transactions: {
    id: string;
    title: string;
    desc: string;
    amount: string;
    date: string;
    type: string;
    category?: string;
  }[];
  expensesForChart?: { id: string; title: string; amount: number; date: string }[];
};

export async function fetchDashboard(userId: string): Promise<DashboardData> {
  const cacheKey = getDashboardCacheKey(userId);
  try {
    const res = await apiFetch(`/api/dashboard/${encodeURIComponent(userId)}`, {
      method: 'GET',
    });
    const text = await res.text();
    if (!res.ok) {
      const data = text ? JSON.parse(text) : {};
      throw new Error((data as { error?: string }).error || `Erreur ${res.status}`);
    }
    const parsed = JSON.parse(text || '{}') as DashboardData;
    await cacheData(cacheKey, parsed);
    return parsed;
  } catch (err) {
    const cached = await getCachedData<DashboardData>(cacheKey);
    if (cached) {
      return cached;
    }
    throw err;
  }
}
