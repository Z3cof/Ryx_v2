import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { ExpenseDonutSection } from '../ExpenseDonutSection';
import { INCOME_CATEGORIES, type ExpenseItem } from '../../services/expenses';
import { animateLayoutEase } from './depensesUtils';
import type { DepensesStyles } from './depensesStyles';

import { TransactionCard } from './TransactionCard';

interface EntreesTabProps {
  styles: DepensesStyles;
  totalIncome: number;
  incomeList: ExpenseItem[];
  incomeDonutSegments: any[];
  incomeDonutGrandTotal: number;
  incomeByCategory: { category: string; items: ExpenseItem[] }[];
  incomeCategoryExpanded: Record<string, boolean>;
  onToggleCategory: (id: string) => void;
  onItemLongPress: (item: ExpenseItem, flow: 'in' | 'out') => void;
  onAddIncome: () => void;
  formatAmount: (n: number) => string;
  formatListDate: (raw: string) => string;
}

export function EntreesTab({
  styles, totalIncome, incomeList, incomeDonutSegments, incomeDonutGrandTotal,
  incomeByCategory, incomeCategoryExpanded, onToggleCategory, onItemLongPress,
  onAddIncome, formatAmount, formatListDate,
}: EntreesTabProps) {
  const { ui, colors } = useAppTheme();
  const { t } = useTranslation();

  const incomeDetailTitle = incomeList.length > 0
    ? t('depenses.detailIncomeCount', {
        count: incomeList.length,
        label: incomeList.length > 1 ? t('depenses.incomeEntriesWord') : t('depenses.incomeEntryWord'),
      })
    : t('depenses.detailIncomeEmpty');

  return (
    <>
      <View style={styles.totalHeroCard}>
        <Text style={styles.totalHeroLabel}>{t('depenses.totalIncome')}</Text>
        <Text style={[styles.totalHeroAmount, styles.totalHeroAmountIncome]}>{formatAmount(totalIncome)}</Text>
      </View>
      <Text style={styles.blockTitle}>{incomeDetailTitle}</Text>
      <View style={styles.section}>
        {incomeList.length === 0 ? (
          <View style={styles.emptyStateIncome}>
            <View style={styles.emptyIconWrapIncome}>
              <Ionicons name="trending-up" size={28} color={ui.textTertiary} />
            </View>
            <Text style={styles.emptyTextIncome}>{t('depenses.emptyIncome')}</Text>
          </View>
        ) : incomeDonutSegments.length > 0 && incomeDonutGrandTotal > 0 ? (
          <ExpenseDonutSection
            segments={incomeDonutSegments}
            grandTotal={incomeDonutGrandTotal}
            flow="in"
            formatAmount={formatAmount}
            formatListDate={formatListDate}
            categoryItemsExpanded={incomeCategoryExpanded}
            onToggleCategory={(categoryId) => { animateLayoutEase(); onToggleCategory(categoryId); }}
            onItemLongPress={onItemLongPress}
          />
        ) : (
          <>
            {incomeByCategory.map(({ category, items }) => {
              const catInfo = INCOME_CATEGORIES.find((c) => c.id === category) ?? INCOME_CATEGORIES[INCOME_CATEGORIES.length - 1];
              const itemsExpanded = incomeCategoryExpanded[category];
              const showFirstTwoOnly = items.length > 2 && !itemsExpanded;
              const visibleItems = showFirstTwoOnly ? items.slice(0, 2) : items;
              return (
                <View key={category} style={styles.categoryBlock}>
                  <View style={styles.categoryHeader}>
                    <Ionicons name={catInfo.icon as keyof typeof Ionicons.glyphMap} size={18} color="#059669" />
                    <Text style={styles.categoryTitle}>{t(catInfo.labelKey)}</Text>
                  </View>
                  {visibleItems.map((item) => (
                    <TransactionCard
                      key={item.id}
                      item={item}
                      flow="in"
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
                      <Ionicons name={itemsExpanded ? 'chevron-up' : 'chevron-down'} size={20} color="#059669" />
                    </Pressable>
                  )}
                </View>
              );
            })}
          </>
        )}
      </View>
      <Pressable
        style={({ pressed }) => [styles.addBtn, styles.addBtnIncomeFab, pressed && styles.addBtnPressed]}
        onPress={onAddIncome}
      >
        <Ionicons name="add-circle" size={24} color={colors.white} />
        <Text style={styles.addBtnText}>{t('depenses.fabAddIncome')}</Text>
      </Pressable>
    </>
  );
}
