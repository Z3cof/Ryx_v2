import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar, type StatusBarStyle } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import type { RecurringCadence, RecurringTemplate } from '../services/recurringTemplatesStorage';

type CategoryDef = {
  id: string;
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type DraftRow = {
  key: string;
  title: string;
  amountStr: string;
  category: string;
  cadence: RecurringCadence;
};

function newRowKey() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function draftsToTemplates(rows: DraftRow[], defaultCategory: string): RecurringTemplate[] {
  const out: RecurringTemplate[] = [];
  for (const r of rows) {
    const title = r.title.trim();
    const n = parseFloat(r.amountStr.replace(/\s/g, '').replace(',', '.'));
    if (!title || Number.isNaN(n) || n <= 0) continue;
    out.push({
      id: r.key,
      title,
      amount: n,
      category: r.category || defaultCategory,
      cadence: r.cadence,
    });
  }
  return out;
}

export type OnboardingRecurringSetupProps = {
  flow: 'income' | 'expense';
  categories: readonly CategoryDef[];
  defaultCategoryId: string;
  titleHintKey: string;
  onContinue: (items: RecurringTemplate[]) => void;
  onSkip: () => void;
};

export function OnboardingRecurringSetup({
  flow,
  categories,
  defaultCategoryId,
  titleHintKey,
  onContinue,
  onSkip,
}: OnboardingRecurringSetupProps) {
  const insets = useSafeAreaInsets();
  const { ui, colors, primary, spacing, radius, fontSize } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(
    () => makeStyles(ui, colors, spacing, radius, fontSize),
    [ui, colors, spacing, radius, fontSize]
  );

  const [rows, setRows] = useState<DraftRow[]>(() => [
    { key: newRowKey(), title: '', amountStr: '', category: defaultCategoryId, cadence: 'month' },
  ]);

  const accent: string = flow === 'income' ? '#059669' : primary.main;

  const addRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      { key: newRowKey(), title: '', amountStr: '', category: defaultCategoryId, cadence: 'month' },
    ]);
  }, [defaultCategoryId]);

  const removeRow = useCallback((key: string) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.key !== key)));
  }, []);

  const updateRow = useCallback((key: string, patch: Partial<DraftRow>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }, []);

  const handleContinue = () => {
    onContinue(draftsToTemplates(rows, defaultCategoryId));
  };

  const handleSkip = () => {
    onSkip();
  };

  const titleKey = flow === 'income' ? 'onboarding.incomeTitle' : 'onboarding.expenseTitle';
  const subKey = flow === 'income' ? 'onboarding.incomeSub' : 'onboarding.expenseSub';

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing[2], paddingBottom: insets.bottom + spacing[4] }]}>
      <StatusBar style={ui.statusBar as StatusBarStyle} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="always"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerIconWrap}>
            <Ionicons name={flow === 'income' ? 'trending-up' : 'trending-down'} size={32} color={accent} />
          </View>
          <Text style={styles.title}>{t(titleKey)}</Text>
          <Text style={styles.subtitle}>{t(subKey)}</Text>

          {rows.map((row, index) => (
            <View key={row.key} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardLabel}>{t('onboarding.lineLabel', { n: index + 1 })}</Text>
                {rows.length > 1 ? (
                  <Pressable
                    hitSlop={8}
                    onPress={() => removeRow(row.key)}
                    style={({ pressed }) => [styles.removeBtn, pressed && styles.removeBtnPressed]}
                  >
                    <Ionicons name="trash-outline" size={20} color="#dc2626" />
                  </Pressable>
                ) : null}
              </View>
              <Text style={styles.fieldLabel}>{t('onboarding.fieldTitle')}</Text>
              <TextInput
                style={styles.input}
                value={row.title}
                onChangeText={(text) => updateRow(row.key, { title: text })}
                placeholder={t(titleHintKey)}
                placeholderTextColor={ui.textTertiary}
              />
              <Text style={styles.fieldLabel}>{t('onboarding.fieldAmount')}</Text>
              <TextInput
                style={styles.input}
                value={row.amountStr}
                onChangeText={(text) => updateRow(row.key, { amountStr: text })}
                placeholder={t('depenses.phAmount')}
                placeholderTextColor={ui.textTertiary}
                keyboardType="decimal-pad"
              />
              <Text style={styles.fieldLabel}>{t('depenses.labelCategory')}</Text>
              <View style={styles.categoryGrid}>
                {categories.map((cat) => {
                  const active = row.category === cat.id;
                  return (
                    <Pressable
                      key={cat.id}
                      style={[
                        styles.chip,
                        active && { backgroundColor: accent, borderColor: accent },
                      ]}
                      onPress={() => updateRow(row.key, { category: cat.id })}
                    >
                      <Ionicons
                        name={cat.icon}
                        size={16}
                        color={active ? colors.white : ui.textSecondary}
                      />
                      <Text
                        style={[styles.chipText, active && { color: colors.white, fontWeight: '600' }]}
                        numberOfLines={1}
                      >
                        {t(cat.labelKey)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.fieldLabel}>{t('depenses.recurringCadenceLabel')}</Text>
              <View style={styles.cadenceToggle}>
                {(['day', 'week', 'month'] as const).map((c) => {
                  const active = row.cadence === c;
                  const label =
                    c === 'day'
                      ? t('depenses.recurringCadenceDay')
                      : c === 'week'
                        ? t('depenses.recurringCadenceWeek')
                        : t('depenses.recurringCadenceMonth');
                  return (
                    <Pressable
                      key={c}
                      style={({ pressed }) => [
                        styles.cadenceChip,
                        active && { backgroundColor: accent, borderColor: accent },
                        pressed && styles.cadenceChipPressed,
                      ]}
                      onPress={() => updateRow(row.key, { cadence: c })}
                    >
                      <Text
                        style={[styles.cadenceChipText, active && { color: colors.white, fontWeight: '600' }]}
                        numberOfLines={1}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          <Pressable
            style={({ pressed }) => [styles.addLineBtn, { borderColor: accent }, pressed && styles.addLineBtnPressed]}
            onPress={addRow}
          >
            <Ionicons name="add-circle-outline" size={22} color={accent} />
            <Text style={[styles.addLineText, { color: accent }]}>{t('onboarding.addLine')}</Text>
          </Pressable>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable style={({ pressed }) => [styles.skipBtn, pressed && styles.skipBtnPressed]} onPress={handleSkip}>
            <Text style={styles.skipBtnText}>{t('onboarding.skip')}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.continueBtn, { backgroundColor: accent }, pressed && styles.continueBtnPressed]}
            onPress={handleContinue}
          >
            <Text style={styles.continueBtnText}>{t('onboarding.continue')}</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function makeStyles(
  ui: ReturnType<typeof import('../theme').getUi>,
  colors: typeof import('../theme').colors,
  spacing: typeof import('../theme').spacing,
  radius: typeof import('../theme').radius,
  fontSize: typeof import('../theme').fontSize
) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: ui.background },
    flex: { flex: 1 },
    scrollContent: { paddingHorizontal: spacing[5], paddingBottom: spacing[6] },
    headerIconWrap: {
      alignSelf: 'center',
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: ui.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing[4],
    },
    title: {
      fontSize: fontSize['2xl'],
      fontWeight: '700',
      color: ui.textTitle,
      textAlign: 'center',
      marginBottom: spacing[2],
    },
    subtitle: {
      fontSize: fontSize.sm,
      color: ui.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: spacing[6],
    },
    card: {
      backgroundColor: ui.surface,
      borderRadius: radius.lg,
      padding: spacing[4],
      marginBottom: spacing[3],
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: ui.border,
    },
    cardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing[2],
    },
    cardLabel: { fontSize: fontSize.sm, fontWeight: '600', color: ui.textTitle },
    removeBtn: { padding: spacing[1] },
    removeBtnPressed: { opacity: 0.7 },
    fieldLabel: {
      fontSize: fontSize.xs,
      color: ui.textSecondary,
      marginBottom: spacing[1],
      marginTop: spacing[2],
    },
    input: {
      borderWidth: 1,
      borderColor: ui.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      fontSize: fontSize.base,
      color: ui.textPrimary,
    },
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing[2],
      marginTop: spacing[2],
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: spacing[1],
      paddingHorizontal: spacing[2],
      borderRadius: radius.full,
      backgroundColor: ui.surfaceMuted,
      borderWidth: 1,
      borderColor: 'transparent',
      maxWidth: '48%',
    },
    chipText: { fontSize: fontSize.xs, color: ui.textSecondary, flexShrink: 1 },
    cadenceToggle: {
      flexDirection: 'row',
      gap: spacing[2],
      marginTop: spacing[2],
    },
    cadenceChip: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing[2],
      paddingHorizontal: spacing[1],
      borderRadius: radius.md,
      borderWidth: 2,
      borderColor: ui.border,
      backgroundColor: ui.surfaceMuted,
      minWidth: 0,
    },
    cadenceChipPressed: { opacity: 0.88 },
    cadenceChipText: {
      fontSize: fontSize.xs,
      fontWeight: '600',
      color: ui.textTitle,
      textAlign: 'center',
    },
    addLineBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing[2],
      paddingVertical: spacing[3],
      borderRadius: radius.lg,
      borderWidth: 2,
      borderStyle: 'dashed',
      marginTop: spacing[2],
    },
    addLineBtnPressed: { opacity: 0.85 },
    addLineText: { fontSize: fontSize.sm, fontWeight: '600' },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
      paddingHorizontal: spacing[5],
      paddingTop: spacing[2],
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: ui.border,
    },
    skipBtn: { paddingVertical: spacing[3], paddingHorizontal: spacing[2] },
    skipBtnPressed: { opacity: 0.7 },
    skipBtnText: { fontSize: fontSize.base, color: ui.textSecondary, fontWeight: '500' },
    continueBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing[2],
      paddingVertical: spacing[4],
      borderRadius: radius.lg,
    },
    continueBtnPressed: { opacity: 0.92 },
    continueBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.base },
  });
}
