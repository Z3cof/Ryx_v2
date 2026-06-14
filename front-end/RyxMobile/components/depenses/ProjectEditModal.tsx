import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { patchProjectGoal, type ProjectGoal } from '../../services/projects';
import { CadenceSelector } from './CadenceSelector';
import type { RecurringCadence } from '../../services/recurring';
import type { DepensesStyles } from './depensesStyles';

interface ProjectEditModalProps {
  styles: DepensesStyles;
  visible: boolean;
  project: ProjectGoal | null;
  onClose: () => void;
  onSuccess: (updated: ProjectGoal) => void;
  userId: string;
}

export function ProjectEditModal({ styles, visible, project, onClose, onSuccess, userId }: ProjectEditModalProps) {
  const { ui, colors, primary } = useAppTheme();
  const { t } = useTranslation();

  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [autoAmount, setAutoAmount] = useState('');
  const [autoCadence, setAutoCadence] = useState<RecurringCadence>('month');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (visible && project) {
      setTitle(project.title || '');
      setTarget(String(project.targetAmount).replace('.', ','));
      setAutoEnabled(!!project.autoEnabled);
      setAutoAmount(project.autoAmount ? String(project.autoAmount).replace('.', ',') : '');
      setAutoCadence(project.autoCadence ?? 'month');
      setError(null);
    }
  }, [visible, project]);

  const handleClose = () => { if (!submitting) { onClose(); setError(null); } };

  const submit = async () => {
    if (!project) return;
    const t_ = title.trim();
    const amt = parseFloat(target.replace(',', '.'));
    if (!t_) { setError(t('depenses.errTitle')); return; }
    if (Number.isNaN(amt) || amt <= 0) { setError(t('depenses.errAmount')); return; }
    if (autoEnabled) {
      const aa = parseFloat(autoAmount.replace(',', '.'));
      if (Number.isNaN(aa) || aa <= 0) { setError(t('depenses.errAmount')); return; }
    }
    setError(null);
    setSubmitting(true);
    try {
      const updated = await patchProjectGoal(userId, project.id, {
        title: t_, targetAmount: amt,
        autoEnabled,
        autoAmount: autoEnabled ? parseFloat(autoAmount.replace(',', '.')) : undefined,
        autoCadence: autoEnabled ? autoCadence : undefined,
      });
      onSuccess(updated);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('depenses.errSave'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.modalBackdrop} onPress={handleClose} />
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('depenses.projectsEdit')}</Text>
            <Pressable onPress={handleClose} style={styles.modalCloseBtn} disabled={submitting}>
              <Ionicons name="close" size={24} color={ui.textSecondary} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>{t('depenses.labelTitle')}</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder={t('depenses.phExpenseTitle')}
              placeholderTextColor={ui.textTertiary} style={styles.input} editable={!submitting} />
            <Text style={styles.inputLabel}>{t('depenses.projectsTarget')}</Text>
            <TextInput value={target} onChangeText={setTarget} placeholder={t('depenses.phAmount')}
              placeholderTextColor={ui.textTertiary} keyboardType="decimal-pad"
              style={styles.input} editable={!submitting} />
            <Pressable
              style={({ pressed }) => [styles.checkboxRow, pressed && { opacity: 0.85 }]}
              onPress={() => { if (!submitting) setAutoEnabled((v) => !v); }}
            >
              <Ionicons name={autoEnabled ? 'checkbox' : 'square-outline'} size={20}
                color={autoEnabled ? primary.main : ui.textSecondary} />
              <Text style={styles.checkboxLabel}>{t('depenses.projectsAutoEnable')}</Text>
            </Pressable>
            {autoEnabled ? (
              <>
                <Text style={styles.inputLabel}>{t('depenses.projectsAutoAmount')}</Text>
                <TextInput value={autoAmount} onChangeText={setAutoAmount} placeholder={t('depenses.phAmount')}
                  placeholderTextColor={ui.textTertiary} keyboardType="decimal-pad"
                  style={styles.input} editable={!submitting} />
                <Text style={styles.inputLabel}>{t('depenses.projectsAutoCadenceLabel')}</Text>
                <CadenceSelector styles={styles} value={autoCadence} flow="out"
                  onChange={setAutoCadence} disabled={submitting} />
              </>
            ) : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Pressable style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
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
