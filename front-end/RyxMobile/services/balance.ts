import { apiFetch } from './apiFetch';

export type MonthlyBalance = {
  year: number;
  month: number;
  balance: number | null;
  currency: string;
};

export async function fetchMonthlyBalance(
  userId: string,
  year: number,
  month: number
): Promise<MonthlyBalance> {
  const params = new URLSearchParams({ year: String(year), month: String(month) });
  const res = await apiFetch(
    `/api/balance/${encodeURIComponent(userId)}?${params}`,
    { method: 'GET' }
  );
  const text = await res.text();
  if (!res.ok) {
    const data = text ? JSON.parse(text) : {};
    throw new Error((data as { error?: string }).error || `Erreur ${res.status}`);
  }
  return JSON.parse(text || '{}') as MonthlyBalance;
}

export async function setMonthlyBalance(
  userId: string,
  year: number,
  month: number,
  balance: number,
  currency?: string
): Promise<MonthlyBalance> {
  const res = await apiFetch(`/api/balance/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    body: JSON.stringify({ year, month, balance, currency: currency || 'XOF' }),
  });
  const text = await res.text();
  if (!res.ok) {
    const data = text ? JSON.parse(text) : {};
    throw new Error((data as { error?: string }).error || `Erreur ${res.status}`);
  }
  return JSON.parse(text || '{}') as MonthlyBalance;
}
