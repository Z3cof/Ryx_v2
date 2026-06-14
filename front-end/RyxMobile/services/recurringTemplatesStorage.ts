import AsyncStorage from '@react-native-async-storage/async-storage';

export type RecurringCadence = 'day' | 'week' | 'month';

export type RecurringTemplate = {
  id: string;
  title: string;
  amount: number;
  category: string;
  cadence?: RecurringCadence;
};

function parseCadence(v: unknown): RecurringCadence | undefined {
  if (v === 'day' || v === 'week' || v === 'month') return v;
  return undefined;
}

const incomeKey = (userId: string) => `ryx_recurring_in_v1_${userId}`;
const expenseKey = (userId: string) => `ryx_recurring_out_v1_${userId}`;

function parseTemplates(raw: string | null): RecurringTemplate[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data
      .filter(
        (row): row is RecurringTemplate =>
          row != null &&
          typeof row === 'object' &&
          typeof (row as RecurringTemplate).id === 'string' &&
          typeof (row as RecurringTemplate).title === 'string' &&
          typeof (row as RecurringTemplate).amount === 'number' &&
          typeof (row as RecurringTemplate).category === 'string'
      )
      .map((row) => ({
        id: row.id,
        title: row.title,
        amount: row.amount,
        category: row.category,
        cadence: parseCadence((row as RecurringTemplate).cadence),
      }));
  } catch {
    return [];
  }
}

export async function loadRecurringIncomeTemplates(userId: string): Promise<RecurringTemplate[]> {
  if (!userId) return [];
  const raw = await AsyncStorage.getItem(incomeKey(userId));
  return parseTemplates(raw);
}

export async function saveRecurringIncomeTemplates(
  userId: string,
  items: RecurringTemplate[]
): Promise<void> {
  if (!userId) return;
  await AsyncStorage.setItem(incomeKey(userId), JSON.stringify(items));
}

export async function loadRecurringExpenseTemplates(userId: string): Promise<RecurringTemplate[]> {
  if (!userId) return [];
  const raw = await AsyncStorage.getItem(expenseKey(userId));
  return parseTemplates(raw);
}

export async function saveRecurringExpenseTemplates(
  userId: string,
  items: RecurringTemplate[]
): Promise<void> {
  if (!userId) return;
  await AsyncStorage.setItem(expenseKey(userId), JSON.stringify(items));
}
