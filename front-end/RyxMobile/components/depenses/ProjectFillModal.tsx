import React, { useState } from 'react';
import { View, Text, Pressable, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { contributeProjectGoal, type ProjectGoal } from '../../services/projects';
import type { DepensesStyles } from './depensesStyles';

interface ProjectFillModalProps {
  styles: DepensesStyles;
  visible: boolean;
  projectId: string | null;
  onClose: () => void;
  onSuccess: (updated: ProjectGoal) => void;
  userId: string;
}

export function ProjectFillModal({ styles, visible, projectId, onClose, onSuccess, userId }: ProjectFillModalProps) {
  const { ui, colors } = useAppTheme();
  const { t } = useTranslation();

  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (visible) { setAmount(''); setError(null); }
  }, [visible]);

  const handleClose = () => { if (!submitting) { onClose(); setError(null); } };

  const submit = async () => {
    if (!projectId) return;
    const amt = parseFloat(amount.replace(',', '.'));
    if (Number.isNaN(amt) || amt <= 0) { setError(t('depenses.errAmount')); return; }
    setError(null);
    setSubmitting(true);
    try {
      const updated = await contributeProjectGoal(userId, projectId, amt);
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
            <Text style={styles.modalTitle}>{t('depenses.projectsManualFill')}</Text>
            <Pressable onPress={handleClose} style={styles.modalCloseBtn} disabled={submitting}>
              <Ionicons name="close" size={24} color={ui.textSecondary} />
            </Pressable>
          </View>
          <Text style={styles.inputLabel}>{t('depenses.projectsManualAmount')}</Text>
          <TextInput value={amount} onChangeText={setAmount} placeholder={t('depenses.phAmount')}
            placeholderTextColor={ui.textTertiary} keyboardType="decimal-pad"
            style={styles.input} editable={!submitting} />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Pressable style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={submit} disabled={submitting}>
            {submitting ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={styles.submitBtnText}>{t('depenses.recurrencesSave')}</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
