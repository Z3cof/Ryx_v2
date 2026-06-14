import AsyncStorage from '@react-native-async-storage/async-storage';

export type PendingTransaction = {
  tempId: string;
  userId: string;
  type: 'in' | 'out';
  title: string;
  amount: number;
  category: string;
  description?: string;
  currency: string;
  date: string;
  markRecurring?: boolean;
  recurringCadence?: string;
};

// Generics for general caching (Dashboard, Summary, etc.)
export async function cacheData(key: string, data: any): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`[Offline Cache] Error saving key ${key}:`, e);
  }
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (e) {
    console.error(`[Offline Cache] Error reading key ${key}:`, e);
    return null;
  }
}

export function getDashboardCacheKey(userId: string): string {
  return `cached_dashboard_${userId}`;
}

export function getSummaryCacheKey(userId: string): string {
  return `cached_summary_${userId}`;
}

export function getExpensesCacheKey(userId: string, year: number, month: number): string {
  return `cached_expenses_${userId}_${year}_${month}`;
}

export function getIncomeCacheKey(userId: string, year: number, month: number): string {
  return `cached_income_${userId}_${year}_${month}`;
}

export function getPendingQueueKey(userId: string): string {
  return `pending_transactions_${userId}`;
}

// Queue operations
export async function getPendingTransactions(userId: string): Promise<PendingTransaction[]> {
  const key = getPendingQueueKey(userId);
  return (await getCachedData<PendingTransaction[]>(key)) || [];
}

export async function savePendingTransaction(
  userId: string,
  tx: Omit<PendingTransaction, 'tempId'>
): Promise<string> {
  const tempId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const key = getPendingQueueKey(userId);
  const queue = await getPendingTransactions(userId);
  const newTx: PendingTransaction = { ...tx, tempId };
  queue.push(newTx);
  await cacheData(key, queue);

  // Appending to monthly cache so that it displays immediately in lists!
  try {
    const parts = tx.date.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);

    if (!Number.isNaN(year) && !Number.isNaN(month)) {
      if (tx.type === 'out') {
        const expKey = getExpensesCacheKey(userId, year, month);
        const cachedExp = await getCachedData<{ expenses: any[]; total: number }>(expKey);
        if (cachedExp) {
          cachedExp.expenses.unshift({
            id: tempId,
            title: tx.title,
            desc: tx.description || '',
            amount: String(tx.amount),
            amountValue: tx.amount,
            currency: tx.currency,
            date: tx.date,
            type: 'out',
            category: tx.category,
            isOfflinePending: true,
          });
          cachedExp.total += tx.amount;
          await cacheData(expKey, cachedExp);
        }
      } else {
        const incKey = getIncomeCacheKey(userId, year, month);
        const cachedInc = await getCachedData<{ income: any[]; total: number }>(incKey);
        if (cachedInc) {
          cachedInc.income.unshift({
            id: tempId,
            title: tx.title,
            desc: tx.description || '',
            amount: String(tx.amount),
            amountValue: tx.amount,
            currency: tx.currency,
            date: tx.date,
            type: 'in',
            category: tx.category,
            isOfflinePending: true,
          });
          cachedInc.total += tx.amount;
          await cacheData(incKey, cachedInc);
        }
      }

      // Update Dashboard cache so totals match instantly
      const dashKey = getDashboardCacheKey(userId);
      const cachedDash = await getCachedData<any>(dashKey);
      if (cachedDash) {
        if (tx.type === 'out') {
          cachedDash.totalDepenses = (cachedDash.totalDepenses || 0) + tx.amount;
          cachedDash.balance = (cachedDash.balance || 0) - tx.amount;
          cachedDash.soldeDisponible = (cachedDash.soldeDisponible || 0) - tx.amount;
        } else {
          cachedDash.totalRevenus = (cachedDash.totalRevenus || 0) + tx.amount;
          cachedDash.balance = (cachedDash.balance || 0) + tx.amount;
          cachedDash.soldeDisponible = (cachedDash.soldeDisponible || 0) + tx.amount;
        }
        cachedDash.transactions = cachedDash.transactions || [];
        cachedDash.transactions.unshift({
          id: tempId,
          title: tx.title,
          desc: tx.description || '',
          amount: String(tx.amount),
          date: tx.date,
          type: tx.type,
          category: tx.category,
          isOfflinePending: true,
        });
        await cacheData(dashKey, cachedDash);
      }
    }
  } catch (err) {
    console.error('[Offline Storage] Failed to update local lists cache:', err);
  }

  return tempId;
}

export async function removePendingTransaction(userId: string, tempId: string): Promise<void> {
  const key = getPendingQueueKey(userId);
  const queue = await getPendingTransactions(userId);
  const filtered = queue.filter((t) => t.tempId !== tempId);
  await cacheData(key, filtered);
}
