import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../services/expenses';
import type { RecurringCadence, RecurringRuleDto } from '../../services/recurring';
import type { DepensesStyles } from './depensesStyles';

interface RecurrencesTabProps {
  styles: DepensesStyles;
  recurringRulesLoading: boolean;
  recurringExpenseTemplates: RecurringRuleDto[];
  recurringIncomeTemplates: RecurringRuleDto[];
  onOpenEditor: (rule: RecurringRuleDto) => void;
  onDelete: (ruleId: string) => void;
  onAddRecurring: (flow: 'in' | 'out') => void;
  formatAmount: (n: number) => string;
  formatCadence: (c: RecurringCadence | undefined) => string;
}

export function RecurrencesTab({
  styles, recurringRulesLoading, recurringExpenseTemplates, recurringIncomeTemplates,
  onOpenEditor, onDelete, onAddRecurring, formatAmount, formatCadence,
}: RecurrencesTabProps) {
  const { ui, colors, primary } = useAppTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.recurrencesSection}>
      <Text style={styles.recurrencesBlockTitle}>{t('onboarding.recurrencesStored')}</Text>
      <Text style={styles.recurrencesIntro}>{t('onboarding.recurrencesIntro')}</Text>
      {recurringRulesLoading && recurringExpenseTemplates.length === 0 && recurringIncomeTemplates.length === 0 ? (
        <View style={styles.recurrencesLoadingWrap}>
          <ActivityIndicator size="small" color={primary.main} />
        </View>
      ) : null}
      {recurringIncomeTemplates.length === 0 && recurringExpenseTemplates.length === 0 ? (
        <View style={styles.recurrencesPlaceholder}>
          <View style={styles.recurrencesIconWrap}>
            <Ionicons name="repeat" size={36} color={ui.textTertiary} />
          </View>
          <Text style={styles.recurrencesPlaceholderText}>{t('onboarding.recurrencesNone')}</Text>
        </View>
      ) : (
        <>
          {recurringExpenseTemplates.length > 0 ? (
            <View style={styles.recurrencesSubBlock}>
              <Text style={styles.recurrencesSubTitle}>{t('onboarding.recurrencesOut')}</Text>
              {recurringExpenseTemplates.map((row) => {
                const cat = EXPENSE_CATEGORIES.find((c) => c.id === row.category) ?? EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
                return (
                  <View key={row.id} style={styles.recurrenceRow}>
                    <Ionicons name={cat.icon as keyof typeof Ionicons.glyphMap} size={20} color={primary.main} style={styles.recurrenceRowIcon} />
                    <Pressable
                      style={({ pressed }) => [styles.recurrenceRowBody, pressed && { opacity: 0.85 }]}
                      onPress={() => onOpenEditor(row)}
                      accessibilityRole="button"
                      accessibilityLabel={t('depenses.recurringEditTitle')}
                    >
                      <Text style={styles.recurrenceRowTitle} numberOfLines={1}>{row.title}</Text>
                      <Text style={styles.recurrenceRowMeta}>{t(cat.labelKey)} · {formatCadence(row.cadence)}</Text>
                    </Pressable>
                    <View style={styles.recurrenceRowRight}>
                      <Text style={styles.recurrenceRowAmount}>{formatAmount(row.amount)}</Text>
                      <Pressable
                        hitSlop={10}
                        onPress={() => onDelete(row.id)}
                        style={({ pressed }) => [styles.recurrenceDeleteBtn, pressed && styles.recurrenceDeleteBtnPressed]}
                      >
                        <Ionicons name="trash-outline" size={20} color={ui.textSecondary} />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}
          {recurringIncomeTemplates.length > 0 ? (
            <View style={styles.recurrencesSubBlock}>
              <Text style={styles.recurrencesSubTitle}>{t('onboarding.recurrencesIn')}</Text>
              {recurringIncomeTemplates.map((row) => {
                const cat = INCOME_CATEGORIES.find((c) => c.id === row.category) ?? INCOME_CATEGORIES[INCOME_CATEGORIES.length - 1];
                return (
                  <View key={row.id} style={styles.recurrenceRow}>
                    <Ionicons name={cat.icon as keyof typeof Ionicons.glyphMap} size={20} color="#059669" style={styles.recurrenceRowIcon} />
                    <Pressable
                      style={({ pressed }) => [styles.recurrenceRowBody, pressed && { opacity: 0.85 }]}
                      onPress={() => onOpenEditor(row)}
                      accessibilityRole="button"
                      accessibilityLabel={t('depenses.recurringEditTitle')}
                    >
                      <Text style={styles.recurrenceRowTitle} numberOfLines={1}>{row.title}</Text>
                      <Text style={styles.recurrenceRowMeta}>{t(cat.labelKey)} · {formatCadence(row.cadence)}</Text>
                    </Pressable>
                    <View style={styles.recurrenceRowRight}>
                      <Text style={styles.recurrenceRowAmountIncome}>{formatAmount(row.amount)}</Text>
                      <Pressable
                        hitSlop={10}
                        onPress={() => onDelete(row.id)}
                        style={({ pressed }) => [styles.recurrenceDeleteBtn, pressed && styles.recurrenceDeleteBtnPressed]}
                      >
                        <Ionicons name="trash-outline" size={20} color={ui.textSecondary} />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}
        </>
      )}
      <View style={styles.recurrencesFabRow}>
        <Pressable
          style={({ pressed }) => [styles.addBtn, styles.addBtnExpense, styles.recurrencesFabHalf, pressed && styles.addBtnPressed]}
          onPress={() => onAddRecurring('out')}
        >
          <Ionicons name="trending-down" size={22} color={colors.white} />
          <Text style={[styles.addBtnText, styles.recurrencesFabBtnText]} numberOfLines={1}>{t('depenses.tabSorties')}</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.addBtn, styles.addBtnIncomeFab, styles.recurrencesFabHalf, pressed && styles.addBtnPressed]}
          onPress={() => onAddRecurring('in')}
        >
          <Ionicons name="trending-up" size={22} color={colors.white} />
          <Text style={[styles.addBtnText, styles.recurrencesFabBtnText]} numberOfLines={1}>{t('depenses.tabEntrees')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
