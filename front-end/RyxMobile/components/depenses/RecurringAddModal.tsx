import React, { useState, useRef } from 'react';
import { View, Text, Pressable, Modal, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../services/expenses';
import { createRecurringRule, ensureRecurringMonth, fetchRecurringRules, type RecurringCadence, type RecurringRuleDto } from '../../services/recurring';
import { CadenceSelector } from './CadenceSelector';
import { CategorySelector } from './CategorySelector';
import type { DepensesStyles } from './depensesStyles';

interface RecurringAddModalProps {
  styles: DepensesStyles;
  visible: boolean;
  initialFlow: 'in' | 'out';
  onClose: () => void;
  onSuccess: (rules: RecurringRuleDto[]) => void;
  userId: string;
  currency: string;
  selectedYear: number;
  selectedMonth: number;
}

export function RecurringAddModal({
  styles, visible, initialFlow, onClose, onSuccess, userId, currency, selectedYear, selectedMonth,
}: RecurringAddModalProps) {
  const { ui, colors, primary } = useAppTheme();
  const { t } = useTranslation();

  const [flow, setFlow] = useState<'in' | 'out'>(initialFlow);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0].id);
  const [cadence, setCadence] = useState<RecurringCadence>('month');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cadenceRef = useRef<RecurringCadence>('month');

  React.useEffect(() => {
    if (visible) {
      setFlow(initialFlow);
      setTitle('');
      setAmount('');
      setCategory(initialFlow === 'in' ? INCOME_CATEGORIES[0].id : EXPENSE_CATEGORIES[0].id);
      setCadence('month');
      cadenceRef.current = 'month';
      setError(null);
    }
  }, [visible, initialFlow]);

  const handleClose = () => { if (!submitting) { onClose(); setError(null); } };
  const categories = flow === 'in' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const submit = async () => {
    const t_ = title.trim();
    const amt = parseFloat(amount.replace(',', '.'));
    if (!t_) { setError(t('depenses.errTitle')); return; }
    if (Number.isNaN(amt) || amt <= 0) { setError(t('depenses.errAmount')); return; }
    setError(null);
    setSubmitting(true);
    try {
      const selectedCadence = cadenceRef.current;
      const created = await createRecurringRule(userId, {
        type: flow, title: t_, amount: amt, category, currency, cadence: selectedCadence,
      });
      const rules = await fetchRecurringRules(userId);
      const createdCadence =
        selectedCadence !== 'month' && (created.cadence == null || created.cadence === 'month')
          ? selectedCadence : (created.cadence ?? selectedCadence);
      const createdSafe: RecurringRuleDto = { ...created, cadence: createdCadence };
      const merged = rules.map((r) => r.id === createdSafe.id ? { ...r, ...createdSafe, cadence: createdSafe.cadence ?? r.cadence } : r);
      onSuccess(merged.some((r) => r.id === createdSafe.id) ? merged : [createdSafe, ...rules]);
      await ensureRecurringMonth(userId, selectedYear, selectedMonth);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('depenses.errSave'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.modalBackdrop} onPress={handleClose} />
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('depenses.recurrencesModalTitle')}</Text>
            <Pressable onPress={handleClose} style={styles.modalCloseBtn} disabled={submitting}>
              <Ionicons name="close" size={24} color={ui.textSecondary} />
            </Pressable>
          </View>
          <View style={styles.recurringFlowToggle}>
            <Pressable
              style={({ pressed }) => [styles.recurringFlowChip, flow === 'out' && styles.recurringFlowChipActiveOut, pressed && styles.recurringFlowChipPressed]}
              onPress={() => { setFlow('out'); setCategory(EXPENSE_CATEGORIES[0].id); }} disabled={submitting}
            >
              <Ionicons name="trending-down" size={18} color={flow === 'out' ? colors.white : primary.main} />
              <Text style={[styles.recurringFlowChipText, flow === 'out' && styles.recurringFlowChipTextActive]} numberOfLines={1}>{t('depenses.tabSorties')}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.recurringFlowChip, flow === 'in' && styles.recurringFlowChipActiveIn, pressed && styles.recurringFlowChipPressed]}
              onPress={() => { setFlow('in'); setCategory(INCOME_CATEGORIES[0].id); }} disabled={submitting}
            >
              <Ionicons name="trending-up" size={18} color={flow === 'in' ? colors.white : '#059669'} />
              <Text style={[styles.recurringFlowChipText, flow === 'in' && styles.recurringFlowChipTextActive]} numberOfLines={1}>{t('depenses.tabEntrees')}</Text>
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>{t('depenses.labelTitle')}</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle}
              placeholder={t(flow === 'in' ? 'depenses.phIncomeTitle' : 'depenses.phExpenseTitle')}
              placeholderTextColor={ui.textTertiary} editable={!submitting} />
            <Text style={styles.inputLabel}>{t('depenses.labelAmount')}</Text>
            <TextInput style={styles.input} value={amount} onChangeText={setAmount}
              placeholder={t('depenses.phAmount')} placeholderTextColor={ui.textTertiary}
              keyboardType="decimal-pad" editable={!submitting} />
            <CategorySelector
              categories={categories}
              selectedCategoryId={category}
              onSelectCategory={setCategory}
              submitting={submitting}
              styles={styles}
            />
            <Text style={styles.inputLabel}>{t('depenses.recurringCadenceLabel')}</Text>
            <CadenceSelector styles={styles} value={cadence} flow={flow} disabled={submitting}
              onChange={(c) => { cadenceRef.current = c; setCadence(c); }} />
            {error ? <Text style={styles.formError}>{error}</Text> : null}
            <Pressable
              style={[styles.submitBtn, flow === 'in' && { backgroundColor: '#059669' }, submitting && styles.submitBtnDisabled]}
              onPress={submit} disabled={submitting}>
              {submitting ? <ActivityIndicator color={colors.white} size="small" />
                : <Text style={styles.submitBtnText}>{t('depenses.recurrencesSave')}</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
