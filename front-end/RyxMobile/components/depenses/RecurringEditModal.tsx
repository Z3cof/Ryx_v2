import React, { useState, useRef } from 'react';
import { View, Text, Pressable, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { patchRecurringRule, type RecurringCadence, type RecurringRuleDto } from '../../services/recurring';
import { CadenceSelector } from './CadenceSelector';
import type { DepensesStyles } from './depensesStyles';

interface RecurringEditModalProps {
  styles: DepensesStyles;
  rule: RecurringRuleDto | null;
  onClose: () => void;
  onSuccess: (updatedRule: RecurringRuleDto) => void;
  userId: string;
}

export function RecurringEditModal({ styles, rule, onClose, onSuccess, userId }: RecurringEditModalProps) {
  const { ui, colors, spacing } = useAppTheme();
  const { t } = useTranslation();

  const [amount, setAmount] = useState('');
  const [cadence, setCadence] = useState<RecurringCadence>('month');
  const [submitting, setSubmitting] = useState(false);
  const cadenceRef = useRef<RecurringCadence>('month');
  const amountRef = useRef('');

  React.useEffect(() => {
    if (rule) {
      const a = String(rule.amount).replace('.', ',');
      setAmount(a);
      amountRef.current = a;
      const c = rule.cadence ?? 'month';
      setCadence(c);
      cadenceRef.current = c;
    }
  }, [rule]);

  const handleClose = () => { if (!submitting) onClose(); };

  const submit = async () => {
    if (!rule) return;
    const amt = parseFloat(amountRef.current.replace(',', '.'));
    if (Number.isNaN(amt) || amt <= 0) return;
    setSubmitting(true);
    try {
      const cad = cadenceRef.current;
      const updated = await patchRecurringRule(userId, rule.id, { amount: amt, cadence: cad });
      const safe: RecurringRuleDto = {
        ...updated,
        cadence: updated.cadence == null || (cad !== 'month' && updated.cadence === 'month') ? cad : updated.cadence,
      };
      onSuccess(safe);
      onClose();
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={rule != null} animationType="fade" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.modalBackdrop} onPress={handleClose} />
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('depenses.recurringEditTitle')}</Text>
            <Pressable onPress={handleClose} style={styles.modalCloseBtn} disabled={submitting}>
              <Ionicons name="close" size={24} color={ui.textSecondary} />
            </Pressable>
          </View>
          {rule ? (
            <View>
              <Text style={styles.recurrenceRowTitle} numberOfLines={2}>{rule.title}</Text>
              <Text style={[styles.recurrencesIntro, { marginTop: spacing[2], marginBottom: spacing[3] }]}>
                {t('depenses.recurringEditHint')}
              </Text>
              <Text style={styles.inputLabel}>{t('depenses.labelAmount')}</Text>
              <TextInput value={amount}
                onChangeText={(v) => { amountRef.current = v; setAmount(v); }}
                placeholder={t('depenses.phAmount')} placeholderTextColor={ui.textTertiary}
                keyboardType="decimal-pad" style={styles.input} editable={!submitting} />
              <Text style={styles.inputLabel}>{t('depenses.recurringCadenceLabel')}</Text>
              <CadenceSelector styles={styles} value={cadence} flow={rule.type}
                onChange={(c) => { cadenceRef.current = c; setCadence(c); }} disabled={submitting} />
              <Pressable
                style={[styles.submitBtn, rule.type === 'in' && { backgroundColor: '#059669' }, submitting && styles.submitBtnDisabled]}
                onPress={submit} disabled={submitting}>
                {submitting ? <ActivityIndicator color={colors.white} size="small" />
                  : <Text style={styles.submitBtnText}>{t('depenses.recurrencesSave')}</Text>}
              </Pressable>
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
