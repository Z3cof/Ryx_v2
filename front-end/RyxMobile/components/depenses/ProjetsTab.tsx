import React from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { applyAutoFillProjectGoal, type ProjectGoal } from '../../services/projects';
import type { DepensesStyles } from './depensesStyles';

interface ProjetsTabProps {
  styles: DepensesStyles;
  projects: ProjectGoal[];
  projectsLoading: boolean;
  userId: string;
  onProjectsChange: (updater: (prev: ProjectGoal[]) => ProjectGoal[]) => void;
  onOpenActions: (p: ProjectGoal) => void;
  onOpenFill: (projectId: string) => void;
  onOpenAdd: () => void;
  formatAmount: (n: number) => string;
}

export function ProjetsTab({
  styles, projects, projectsLoading, userId,
  onProjectsChange, onOpenActions, onOpenFill, onOpenAdd, formatAmount,
}: ProjetsTabProps) {
  const { ui, colors, primary } = useAppTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.recurrencesSection}>
      <View style={styles.projectsCompactHeader}>
        <View style={styles.projectsCompactTitleRow}>
          <Ionicons name="flag" size={18} color={primary.main} />
          <Text style={styles.recurrencesBlockTitle}>{t('depenses.projectsTitle')}</Text>
        </View>
        <Text style={styles.projectsHint}>{t('depenses.projectsLongPressHint')}</Text>
      </View>
      {projectsLoading && projects.length === 0 ? (
        <View style={styles.recurrencesLoadingWrap}>
          <ActivityIndicator size="small" color={primary.main} />
        </View>
      ) : null}
      {projects.length === 0 ? (
        <View style={styles.recurrencesPlaceholder}>
          <View style={styles.recurrencesIconWrap}>
            <Ionicons name="flag-outline" size={36} color={ui.textTertiary} />
          </View>
          <Text style={styles.recurrencesPlaceholderText}>{t('depenses.projectsEmpty')}</Text>
        </View>
      ) : (
        <View style={styles.projectsList}>
          {projects.map((p) => (
            <Pressable
              key={p.id}
              style={({ pressed }) => [styles.projectCard, pressed && styles.expenseCardPressed]}
              onLongPress={() => onOpenActions(p)}
            >
              <View style={styles.projectCompactTop}>
                <Text style={styles.projectCardTitle} numberOfLines={1}>{p.title}</Text>
                <Text style={styles.projectCardPct}>{p.progressPercent}%</Text>
              </View>
              <View style={styles.projectProgressTrack}>
                <View style={[styles.projectProgressFill, { width: `${Math.max(0, p.progressPercent)}%` }]} />
              </View>
              <View style={styles.projectCompactAmounts}>
                <Text style={styles.projectCompactAmountMain}>{formatAmount(p.currentAmount)}</Text>
                <Text style={styles.projectCompactAmountMuted}>/ {formatAmount(p.targetAmount)}</Text>
                <Text style={styles.projectCompactDot}>•</Text>
                <Text style={styles.projectCompactRemaining}>
                  {t('depenses.projectsRemaining', { remaining: formatAmount(p.remainingAmount) })}
                </Text>
              </View>
              <View style={styles.projectActionsRow}>
                <Pressable
                  style={({ pressed }) => [styles.projectActionBtn, styles.projectActionBtnPrimary, pressed && styles.addBtnPressed]}
                  onPress={() => onOpenFill(p.id)}
                >
                  <Text style={styles.projectActionBtnText}>{t('depenses.projectsManualFill')}</Text>
                </Pressable>
                {p.autoEnabled && p.autoAmount > 0 ? (
                  <Pressable
                    style={({ pressed }) => [styles.projectActionBtn, pressed && styles.addBtnPressed]}
                    onPress={async () => {
                      try {
                        const updated = await applyAutoFillProjectGoal(userId, p.id);
                        onProjectsChange((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
                      } catch (e) {
                        Alert.alert(t('depenses.errGeneric'), e instanceof Error ? e.message : t('depenses.errSave'));
                      }
                    }}
                  >
                    <Text style={styles.projectActionBtnTextSecondary}>{t('depenses.projectsAutoFillNow')}</Text>
                  </Pressable>
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      )}
      <Pressable
        style={({ pressed }) => [styles.addBtn, styles.addBtnExpense, pressed && styles.addBtnPressed]}
        onPress={onOpenAdd}
      >
        <Ionicons name="add-circle" size={24} color={colors.white} />
        <Text style={styles.addBtnText}>{t('depenses.projectsAdd')}</Text>
      </Pressable>
    </View>
  );
}
