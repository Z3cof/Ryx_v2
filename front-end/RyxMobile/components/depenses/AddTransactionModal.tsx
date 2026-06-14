import React, { useState, useCallback, useRef } from 'react';
import { View, Text, Pressable, Modal, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { createExpense, createIncome, EXPENSE_CATEGORIES, INCOME_CATEGORIES, toTransactionDateOnly } from '../../services/expenses';
import { createRecurringRule, ensureRecurringMonth, type RecurringCadence } from '../../services/recurring';
import { CadenceSelector } from './CadenceSelector';
import { CategorySelector } from './CategorySelector';
import type { DepensesStyles } from './depensesStyles';

interface AddTransactionModalProps {
  styles: DepensesStyles;
  visible: boolean;
  initialStep: 'choice' | 'income' | 'expense';
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  currency: string;
  selectedYear: number;
  selectedMonth: number;
}

export function AddTransactionModal({
  styles, visible, initialStep, onClose, onSuccess,
  userId, currency, selectedYear, selectedMonth,
}: AddTransactionModalProps) {
  const { ui, colors, primary } = useAppTheme();
  const { t, locale } = useTranslation();
  const dateLocaleTag = locale === 'en' ? 'en-US' : 'fr-FR';

  const [step, setStep] = useState<'choice' | 'income' | 'expense'>(initialStep);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0].id);
  const [incomeCategory, setIncomeCategory] = useState<string>(INCOME_CATEGORIES[0].id);
  const [description, setDescription] = useState('');
  const [markRecurring, setMarkRecurring] = useState(false);
  const [recurringCadence, setRecurringCadence] = useState<RecurringCadence>('month');
  const [transactionDate, setTransactionDate] = useState(() => new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cadenceRef = useRef<RecurringCadence>('month');

  // Reset state when modal opens
  React.useEffect(() => {
    if (visible) {
      setStep(initialStep);
      setTitle('');
      setAmount('');
      setCategory(EXPENSE_CATEGORIES[0].id);
      setIncomeCategory(INCOME_CATEGORIES[0].id);
      setDescription('');
      setMarkRecurring(false);
      setRecurringCadence('month');
      cadenceRef.current = 'month';
      setTransactionDate(new Date());
      setShowDatePicker(false);
      setError(null);
    }
  }, [visible, initialStep]);

  const handleClose = () => { if (!submitting) { setStep('choice'); onClose(); } };

  const formatDate = useCallback(
    (d: Date) => d.toLocaleDateString(dateLocaleTag, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
    [dateLocaleTag]
  );

  const onDateChange = useCallback((_e: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) setTransactionDate(date);
  }, []);

  const submit = async (flow: 'in' | 'out') => {
    const t_ = title.trim();
    const amt = parseFloat(amount.replace(',', '.'));
    if (!t_) { setError(t('depenses.errTitle')); return; }
    if (Number.isNaN(amt) || amt <= 0) { setError(t('depenses.errAmount')); return; }
    setError(null);
    setSubmitting(true);
    try {
      const cat = flow === 'in' ? incomeCategory : category;
      const createFn = flow === 'in' ? createIncome : createExpense;
      const res = await createFn(userId, {
        title: t_, amount: amt, category: cat,
        description: description.trim() || undefined,
        currency, date: toTransactionDateOnly(transactionDate),
      });
      if (res.offline) {
        Alert.alert(
          locale === 'en' ? 'Saved offline!' : 'Enregistré hors ligne !',
          locale === 'en'
            ? 'Your transaction has been saved on your device. It will be synchronized with the database as soon as you connect to the internet.'
            : 'Votre transaction a été enregistrée sur votre appareil. Elle sera automatiquement synchronisée avec la base de données dès que vous serez connecté à internet.'
        );
      } else if (markRecurring) {
        try {
          await createRecurringRule(userId, {
            type: flow, title: t_, amount: amt, category: cat,
            currency, cadence: cadenceRef.current,
          });
          await ensureRecurringMonth(userId, transactionDate.getFullYear(), transactionDate.getMonth() + 1);
        } catch {
          Alert.alert(
            t('depenses.recurringPartialTitle'),
            t(flow === 'in' ? 'depenses.recurringPartialIncomeBody' : 'depenses.recurringPartialExpenseBody')
          );
        }
      }
      handleClose();
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('depenses.errSave'));
    } finally {
      setSubmitting(false);
    }
  };

  const renderForm = (flow: 'in' | 'out') => {
    const categories = flow === 'in' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const selectedCat = flow === 'in' ? incomeCategory : category;
    const setCat = flow === 'in' ? setIncomeCategory : setCategory;
    return (
      <ScrollView keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false}>
        <Text style={styles.inputLabel}>{t('depenses.labelTitle')}</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle}
          placeholder={t(flow === 'in' ? 'depenses.phIncomeTitle' : 'depenses.phExpenseTitle')}
          placeholderTextColor={ui.textTertiary} editable={!submitting} />
        <Text style={styles.inputLabel}>{t('depenses.labelAmount')}</Text>
        <TextInput style={styles.input} value={amount} onChangeText={setAmount}
          placeholder={t('depenses.phAmount')} placeholderTextColor={ui.textTertiary}
          keyboardType="decimal-pad" editable={!submitting} />
        <Text style={styles.inputLabel}>{t('depenses.labelDate')}</Text>
        <Pressable
          style={({ pressed }) => [styles.datePickPressable, pressed && styles.datePickPressablePressed]}
          onPress={() => !submitting && setShowDatePicker(true)} disabled={submitting}
        >
          <Ionicons name="calendar-outline" size={22} color={primary.main} />
          <Text style={styles.datePickText}>{formatDate(transactionDate)}</Text>
        </Pressable>
        {Platform.OS === 'ios' ? (
          <Modal visible={showDatePicker} transparent animationType="fade">
            <View style={styles.dateIosBackdrop}>
              <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowDatePicker(false)} />
              <View style={styles.dateIosSheet}>
                <DateTimePicker value={transactionDate} mode="date" display="spinner"
                  onChange={(_, d) => d && setTransactionDate(d)}
                  minimumDate={new Date(2000, 0, 1)} maximumDate={new Date(2100, 11, 31)} />
                <Pressable style={styles.dateIosDoneBtn} onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.dateIosDoneText}>{t('depenses.close')}</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        ) : showDatePicker ? (
          <DateTimePicker value={transactionDate} mode="date" display="default"
            onChange={onDateChange} minimumDate={new Date(2000, 0, 1)} maximumDate={new Date(2100, 11, 31)} />
        ) : null}
        <Text style={styles.inputLabel}>{t('depenses.labelCategory')}</Text>
        <CategorySelector
          categories={categories}
          selectedCategoryId={selectedCat}
          onSelectCategory={setCat}
          submitting={submitting}
          styles={styles}
        />
        <Text style={styles.inputLabel}>{t('depenses.labelDesc')}</Text>
        <TextInput style={[styles.input, styles.inputMultiline]} value={description}
          onChangeText={setDescription} placeholder={t('depenses.phNotes')}
          placeholderTextColor={ui.textTertiary} multiline numberOfLines={2} editable={!submitting} />
        <Pressable
          style={({ pressed }) => [styles.checkboxRow, pressed && styles.checkboxRowPressed]}
          onPress={() => !submitting && setMarkRecurring((v) => !v)} disabled={submitting}
        >
          <Ionicons name={markRecurring ? 'checkbox' : 'square-outline'} size={22}
            color={markRecurring ? primary.main : ui.textSecondary} />
          <Text style={styles.checkboxLabel}>
            {t(flow === 'in' ? 'depenses.recurringCheckboxIncome' : 'depenses.recurringCheckboxExpense')}
          </Text>
        </Pressable>
        {markRecurring ? (
          <>
            <Text style={styles.inputLabel}>{t('depenses.recurringCadenceLabel')}</Text>
            <CadenceSelector styles={styles} value={recurringCadence} flow={flow}
              onChange={(c) => { cadenceRef.current = c; setRecurringCadence(c); }} disabled={submitting} />
          </>
        ) : null}
        {error ? <Text style={styles.formError}>{error}</Text> : null}
        <Pressable style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={() => submit(flow)} disabled={submitting}
        >
          {submitting ? <ActivityIndicator color={colors.white} size="small" />
            : <Text style={styles.submitBtnText}>{t(flow === 'in' ? 'depenses.saveIncome' : 'depenses.saveExpense')}</Text>}
        </Pressable>
      </ScrollView>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.modalBackdrop} onPress={handleClose} />
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {step === 'choice' ? t('depenses.modalAdd') : step === 'income' ? t('depenses.modalIncome') : t('depenses.modalExpense')}
            </Text>
            {step === 'choice' ? (
              <Pressable onPress={handleClose} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={ui.textSecondary} />
              </Pressable>
            ) : (
              <Pressable onPress={() => { setError(null); setStep('choice'); }} style={styles.modalCloseBtn} disabled={submitting}>
                <Ionicons name="arrow-back" size={24} color={ui.textSecondary} />
              </Pressable>
            )}
          </View>
          {step === 'choice' && (
            <View style={styles.addChoiceWrap}>
              <Text style={styles.addChoiceLabel}>{t('depenses.choiceQ')}</Text>
              <Pressable
                style={({ pressed }) => [styles.addChoiceBtn, styles.addChoiceBtnIncome, pressed && styles.addChoiceBtnPressed]}
                onPress={() => { setError(null); setStep('income'); }}
              >
                <Ionicons name="trending-up" size={28} color="#059669" />
                <View style={styles.addChoiceBtnTextWrap}>
                  <Text style={styles.addChoiceBtnTitle}>{t('depenses.choiceIncomeTitle')}</Text>
                  <Text style={styles.addChoiceBtnSub}>{t('depenses.choiceIncomeSub')}</Text>
                </View>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.addChoiceBtn, styles.addChoiceBtnExpense, pressed && styles.addChoiceBtnPressed]}
                onPress={() => { setError(null); setStep('expense'); }}
              >
                <Ionicons name="trending-down" size={28} color="#dc2626" />
                <View style={styles.addChoiceBtnTextWrap}>
                  <Text style={styles.addChoiceBtnTitle}>{t('depenses.choiceExpenseTitle')}</Text>
                  <Text style={styles.addChoiceBtnSub}>{t('depenses.choiceExpenseSub')}</Text>
                </View>
              </Pressable>
            </View>
          )}
          {step === 'income' && renderForm('in')}
          {step === 'expense' && renderForm('out')}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
