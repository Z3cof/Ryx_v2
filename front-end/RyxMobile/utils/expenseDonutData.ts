import { Ionicons } from '@expo/vector-icons';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type ExpenseItem,
} from '../services/expenses';
import { DONUT_SEGMENT_COLORS, type ExpenseDonutSegment } from '../components/ExpenseDonutSection';

export type DonutCategoryDef = {
  id: string;
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export function parseExpenseAmountString(raw: string): number {
  const cleaned = String(raw).replace(/\s/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** Regroupe les lignes selon un ordre de catégories connu ; le reste va dans `fallbackId`. */
export function groupByCategoryOrder(
  items: ExpenseItem[],
  orderedIds: readonly string[],
  fallbackId: string
): { category: string; items: ExpenseItem[] }[] {
  const known = new Set(orderedIds);
  const map = new Map<string, ExpenseItem[]>();
  for (const e of items) {
    let cat = e.category || fallbackId;
    if (!known.has(cat)) {
      cat = fallbackId;
    }
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(e);
  }
  return orderedIds
    .filter((cat) => map.has(cat))
    .map((category) => ({ category, items: map.get(category)! }));
}

export function groupExpensesByCategory(
  expenses: ExpenseItem[]
): { category: string; items: ExpenseItem[] }[] {
  return groupByCategoryOrder(
    expenses,
    EXPENSE_CATEGORIES.map((c) => c.id),
    'Autre'
  );
}

export function groupIncomeByCategory(
  items: ExpenseItem[]
): { category: string; items: ExpenseItem[] }[] {
  return groupByCategoryOrder(
    items,
    INCOME_CATEGORIES.map((c) => c.id),
    'Autre'
  );
}

export function buildExpenseDonutSegments(
  expensesByCategory: { category: string; items: ExpenseItem[] }[],
  categoryDefs: readonly DonutCategoryDef[] = EXPENSE_CATEGORIES as unknown as readonly DonutCategoryDef[]
): { segments: ExpenseDonutSegment[]; grandTotal: number } {
  const palette = [...DONUT_SEGMENT_COLORS];
  const rows = expensesByCategory
    .map(({ category, items }) => {
      let total = 0;
      for (const it of items) {
        total += parseExpenseAmountString(it.amount);
      }
      const meta =
        categoryDefs.find((c) => c.id === category) ?? categoryDefs[categoryDefs.length - 1];
      return {
        categoryId: category,
        labelKey: meta.labelKey,
        icon: meta.icon as keyof typeof Ionicons.glyphMap,
        total,
        count: items.length,
        items,
        color: '#94a3b8',
      };
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);
  const segments: ExpenseDonutSegment[] = rows.map((r, idx) => ({
    categoryId: r.categoryId,
    labelKey: r.labelKey,
    icon: r.icon,
    total: r.total,
    count: r.count,
    color: palette[idx % palette.length],
    items: r.items,
  }));
  return { segments, grandTotal };
}
