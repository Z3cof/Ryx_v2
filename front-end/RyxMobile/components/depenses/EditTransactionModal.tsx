import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, Modal, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from '../../hooks/useTranslation';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  toTransactionDateOnly,
  updateTransaction,
  deleteTransaction,
  type ExpenseItem,
} from '../../services/expenses';
import { parseAmountFromDisplay } from './depensesUtils';
import { CategorySelector } from './CategorySelector';
import type { DepensesStyles } from './depensesStyles';

interface EditTransactionModalProps {
  styles: DepensesStyles;
  visible: boolean;
  item: ExpenseItem | null;
  flow: 'in' | 'out';
  onClose: () => void;
  onSuccess: () => void;
  currency: string;
}

export function EditTransactionModal({
  styles, visible, item, flow, onClose, onSuccess, currency,
}: EditTransactionModalProps) {
  const { ui, colors, primary } = useAppTheme();
  const { t, locale } = useTranslation();
  const dateLocaleTag = locale === 'en' ? 'en-US' : 'fr-FR';

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [cat, setCat] = useState<string>(EXPENSE_CATEGORIES[0].id);
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState(() => new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Après suppression : on garde le modal ouvert jusqu’au choix explicite de l’utilisateur. */
  const [wasDeleted, setWasDeleted] = useState(false);

  React.useEffect(() => {
    if (visible && item) {
      const iso = item.createdAtIso ? Date.parse(item.createdAtIso) : Number.NaN;
      const amountValue =
        typeof item.amountValue === 'number' && Number.isFinite(item.amountValue)
          ? Math.abs(item.amountValue) : parseAmountFromDisplay(item.amount);
      setTitle(item.title || '');
      setAmount(amountValue == null ? '' : String(amountValue).replace('.', ','));
      setCat(item.category || (flow === 'in' ? INCOME_CATEGORIES[0].id : EXPENSE_CATEGORIES[0].id));
      setDesc(item.desc || '');
      setDate(Number.isNaN(iso) ? new Date() : new Date(iso));
      setShowDatePicker(false);
      setError(null);
      setWasDeleted(false);
    }
  }, [visible, item, flow]);

  const handleClose = () => {
    if (!submitting && !deleting) {
      setWasDeleted(false);
      onClose();
      setError(null);
    }
  };

  const formatDate_ = useCallback(
    (d: Date) => d.toLocaleDateString(dateLocaleTag, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
    [dateLocaleTag]
  );

  const onDateChange = useCallback((_e: DateTimePickerEvent, d?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (d) setDate(d);
  }, []);

  const requestDelete = () => {
    if (!item || submitting || deleting || wasDeleted) return;
    Alert.alert(t('depenses.editDeleteTitle'), t('depenses.editDeleteBody'), [
      { text: t('depenses.close'), style: 'cancel' },
      {
        text: t('depenses.deleteAction'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setError(null);
            setDeleting(true);
            try {
              await deleteTransaction(item.id);
              setWasDeleted(true);
              onSuccess();
            } catch (e) {
              setError(e instanceof Error ? e.message : t('depenses.errSave'));
            } finally {
              setDeleting(false);
            }
          })();
        },
      },
    ]);
  };

  const submit = async () => {
    if (!item || wasDeleted) return;
    const t_ = title.trim();
    const amt = parseFloat(amount.replace(',', '.'));
    if (!t_) { setError(t('depenses.errTitle')); return; }
    if (Number.isNaN(amt) || amt <= 0) { setError(t('depenses.errAmount')); return; }
    setError(null);
    setSubmitting(true);
    try {
      await updateTransaction(item.id, {
        title: t_, amount: amt, category: cat,
        description: desc.trim(), currency, date: toTransactionDateOnly(date),
      });
      onClose();
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('depenses.errSave'));
    } finally {
      setSubmitting(false);
    }
  };

  const categories = flow === 'in' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable
          style={styles.modalBackdrop}
          onPress={wasDeleted ? undefined : handleClose}
          pointerEvents={wasDeleted ? 'none' : 'auto'}
        />
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {wasDeleted ? t('depenses.editDeletedTitle') : flow === 'in' ? t('depenses.editIncomeTitle') : t('depenses.editExpenseTitle')}
            </Text>
            <Pressable onPress={handleClose} style={styles.modalCloseBtn} disabled={submitting || deleting}>
              <Ionicons name="close" size={24} color={ui.textSecondary} />
            </Pressable>
          </View>
          {wasDeleted ? (
            <View style={stylesDeleted.wrap}>
              <Ionicons name="checkmark-circle" size={56} color="#059669" style={stylesDeleted.icon} />
              <Text style={[styles.modalTitle, stylesDeleted.title]}>{t('depenses.editDeletedMsg')}</Text>
              <Pressable
                style={[styles.submitBtn, { backgroundColor: primary.main, marginTop: 20 }]}
                onPress={handleClose}
              >
                <Text style={styles.submitBtnText}>{t('depenses.close')}</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>{t('depenses.labelTitle')}</Text>
              <TextInput style={styles.input} value={title} onChangeText={setTitle}
                placeholder={t(flow === 'in' ? 'depenses.phIncomeTitle' : 'depenses.phExpenseTitle')}
                placeholderTextColor={ui.textTertiary} editable={!submitting && !deleting} />
              <Text style={styles.inputLabel}>{t('depenses.labelAmount')}</Text>
              <TextInput style={styles.input} value={amount} onChangeText={setAmount}
                placeholder={t('depenses.phAmount')} placeholderTextColor={ui.textTertiary}
                keyboardType="decimal-pad" editable={!submitting && !deleting} />
              <Text style={styles.inputLabel}>{t('depenses.labelDate')}</Text>
              <Pressable style={({ pressed }) => [styles.datePickPressable, pressed && styles.datePickPressablePressed]}
                onPress={() => !submitting && !deleting && setShowDatePicker(true)} disabled={submitting || deleting}>
                <Ionicons name="calendar-outline" size={22} color={primary.main} />
                <Text style={styles.datePickText}>{formatDate_(date)}</Text>
              </Pressable>
              {Platform.OS === 'ios' ? (
                <Modal visible={showDatePicker} transparent animationType="fade">
                  <View style={styles.dateIosBackdrop}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowDatePicker(false)} />
                    <View style={styles.dateIosSheet}>
                      <DateTimePicker value={date} mode="date" display="spinner"
                        onChange={(_, d) => d && setDate(d)} minimumDate={new Date(2000, 0, 1)} maximumDate={new Date(2100, 11, 31)} />
                      <Pressable style={styles.dateIosDoneBtn} onPress={() => setShowDatePicker(false)}>
                        <Text style={styles.dateIosDoneText}>{t('depenses.close')}</Text>
                      </Pressable>
                    </View>
                  </View>
                </Modal>
              ) : showDatePicker ? (
                <DateTimePicker value={date} mode="date" display="default"
                  onChange={onDateChange} minimumDate={new Date(2000, 0, 1)} maximumDate={new Date(2100, 11, 31)} />
              ) : null}
              <Text style={styles.inputLabel}>{t('depenses.labelCategory')}</Text>
              <CategorySelector
                categories={categories}
                selectedCategoryId={cat}
                onSelectCategory={setCat}
                submitting={submitting || deleting}
                styles={styles}
              />
              <Text style={styles.inputLabel}>{t('depenses.labelDesc')}</Text>
              <TextInput style={[styles.input, styles.inputMultiline]} value={desc} onChangeText={setDesc}
                placeholder={t('depenses.phNotes')} placeholderTextColor={ui.textTertiary}
                multiline numberOfLines={2} editable={!submitting && !deleting} />
              {error ? <Text style={styles.formError}>{error}</Text> : null}
              <Pressable
                style={[styles.submitBtn, stylesDeleted.deleteBtn]}
                onPress={requestDelete}
                disabled={submitting || deleting}
              >
                {deleting ? <ActivityIndicator color="#dc2626" size="small" />
                  : <Text style={stylesDeleted.deleteBtnText}>{t('depenses.deleteAction')}</Text>}
              </Pressable>
              <Pressable
                style={[styles.submitBtn, flow === 'in' && { backgroundColor: '#059669' }, (submitting || deleting) && styles.submitBtnDisabled]}
                onPress={submit} disabled={submitting || deleting}>
                {submitting ? <ActivityIndicator color={colors.white} size="small" />
                  : <Text style={styles.submitBtnText}>{t('depenses.editSave')}</Text>}
              </Pressable>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const stylesDeleted = StyleSheet.create({
  wrap: { paddingVertical: 24, paddingHorizontal: 8, alignItems: 'center' },
  icon: { marginBottom: 12 },
  title: { textAlign: 'center', fontSize: 16, fontWeight: '600', marginTop: 4 },
  deleteBtn: {
    marginTop: 8,
    marginBottom: 10,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#dc2626',
  },
  deleteBtnText: { color: '#dc2626', fontWeight: '700', fontSize: 16 },
});
