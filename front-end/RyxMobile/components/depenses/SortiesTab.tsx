import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { ExpenseDonutSection } from '../ExpenseDonutSection';
import { EXPENSE_CATEGORIES, type ExpenseItem } from '../../services/expenses';
import { animateLayoutEase } from './depensesUtils';
import type { DepensesStyles } from './depensesStyles';

import { TransactionCard } from './TransactionCard';

interface SortiesTabProps {
  styles: DepensesStyles;
  totalDepenses: number;
  expenses: ExpenseItem[];
  expenseDonutSegments: any[];
  expenseDonutGrandTotal: number;
  expensesByCategory: { category: string; items: ExpenseItem[] }[];
  summary: { currentMonthTotal?: number; currentYearTotal?: number } | null;
  selectedYear: number;
  selectedMonth: number;
  currentYear: number;
  currentMonth: number;
  categoryItemsExpanded: Record<string, boolean>;
  onToggleCategory: (id: string) => void;
  onItemLongPress: (item: ExpenseItem, flow: 'in' | 'out') => void;
  onAddExpense: () => void;
  formatAmount: (n: number) => string;
  formatListDate: (raw: string) => string;
}

export function SortiesTab({
  styles, totalDepenses, expenses, expenseDonutSegments, expenseDonutGrandTotal,
  expensesByCategory, summary, selectedYear, selectedMonth, currentYear, currentMonth,
  categoryItemsExpanded, onToggleCategory, onItemLongPress, onAddExpense,
  formatAmount, formatListDate,
}: SortiesTabProps) {
  const { ui, colors, primary } = useAppTheme();
  const { t } = useTranslation();

  return (
    <>
      <View style={styles.totalHeroCard}>
        <Text style={styles.totalHeroLabel}>{t('depenses.totalLabel')}</Text>
        <Text style={styles.totalHeroAmount}>{formatAmount(totalDepenses)}</Text>
        {summary != null && (selectedYear !== currentYear || selectedMonth !== currentMonth) && (
          <Text style={styles.totalHeroHint}>
            {t('depenses.totalHint', {
              current: formatAmount(summary.currentMonthTotal ?? 0),
              year: formatAmount(summary.currentYearTotal ?? 0),
            })}
          </Text>
        )}
      </View>

      <Text style={styles.blockTitle}>
        {expenses.length > 0
          ? t('depenses.detailCount', {
              count: expenses.length,
              label: expenses.length > 1 ? t('depenses.expensesWord') : t('depenses.expenseWord'),
            })
          : t('depenses.detailEmpty')}
      </Text>
      <View style={styles.section}>
        {expenses.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="receipt-outline" size={40} color={ui.textTertiary} />
            </View>
            <Text style={styles.emptyText}>{t('depenses.emptyExpense')}</Text>
            <Text style={styles.emptySub}>{t('depenses.emptyExpenseSub')}</Text>
          </View>
        ) : expenseDonutSegments.length > 0 && expenseDonutGrandTotal > 0 ? (
          <ExpenseDonutSection
            segments={expenseDonutSegments}
            grandTotal={expenseDonutGrandTotal}
            formatAmount={formatAmount}
            formatListDate={formatListDate}
            categoryItemsExpanded={categoryItemsExpanded}
            onToggleCategory={(categoryId) => { animateLayoutEase(); onToggleCategory(categoryId); }}
            onItemLongPress={onItemLongPress}
          />
        ) : (
          <>
            {expensesByCategory.map(({ category, items }) => {
              const catInfo = EXPENSE_CATEGORIES.find((c) => c.id === category) ?? EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
              const itemsExpanded = categoryItemsExpanded[category];
              const showFirstTwoOnly = items.length > 2 && !itemsExpanded;
              const visibleItems = showFirstTwoOnly ? items.slice(0, 2) : items;
              return (
                <View key={category} style={styles.categoryBlock}>
                  <View style={styles.categoryHeader}>
                    <Ionicons name={catInfo.icon as keyof typeof Ionicons.glyphMap} size={18} color={primary.main} />
                    <Text style={styles.categoryTitle}>{t(catInfo.labelKey)}</Text>
                  </View>
                  {visibleItems.map((item) => (
                    <TransactionCard
                      key={item.id}
                      item={item}
                      flow="out"
                      styles={styles}
                      onLongPress={onItemLongPress}
                      formatListDate={formatListDate}
                    />
                  ))}
                  {items.length > 2 && (
                    <Pressable
                      style={({ pressed }) => [styles.categoriesToggle, styles.categoryItemsToggle, pressed && styles.categoriesTogglePressed]}
                      onPress={() => { animateLayoutEase(); onToggleCategory(category); }}
                    >
                      <Text style={styles.categoriesToggleText}>
                        {itemsExpanded
                          ? t('depenses.collapse')
                          : items.length - 2 === 1 ? t('depenses.showMoreOne') : t('depenses.showMoreMany', { n: items.length - 2 })}
                      </Text>
                      <Ionicons name={itemsExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={primary.main} />
                    </Pressable>
                  )}
                </View>
              );
            })}
          </>
        )}
      </View>

      <Pressable
        style={({ pressed }) => [styles.addBtn, styles.addBtnExpense, pressed && styles.addBtnPressed]}
        onPress={onAddExpense}
      >
        <Ionicons name="add-circle" size={24} color={colors.white} />
        <Text style={styles.addBtnText}>{t('depenses.fabAddExpense')}</Text>
      </Pressable>
    </>
  );
}
