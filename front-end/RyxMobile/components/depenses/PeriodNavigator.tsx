import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { animateLayoutEase } from './depensesUtils';
import type { DepensesStyles } from './depensesStyles';

export type MainTab = 'sorties' | 'entrees' | 'recurrences' | 'projets';

interface PeriodNavigatorProps {
  styles: DepensesStyles;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  periodLabel: string;
  onOpenPicker: () => void;
  activeTab: MainTab;
  onChangeTab: (tab: MainTab) => void;
  topInset: number;
}

export function PeriodNavigator({
  styles, canGoPrev, canGoNext, onPrev, onNext,
  periodLabel, onOpenPicker, activeTab, onChangeTab, topInset,
}: PeriodNavigatorProps) {
  const { ui, spacing } = useAppTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.periodChromeShell, { backgroundColor: ui.surface, borderBottomColor: ui.border }]}>
      <View style={{ paddingHorizontal: 20, paddingTop: topInset + spacing[3] }}>
        <View style={styles.periodNavRow}>
          <Pressable
            style={({ pressed }) => [
              styles.periodArrowBtn,
              { borderColor: ui.border },
              !canGoPrev && styles.periodArrowBtnDisabled,
              pressed && canGoPrev && styles.periodArrowBtnPressed,
            ]}
            onPress={onPrev}
            disabled={!canGoPrev}
          >
            <Ionicons name="chevron-back" size={22} color={canGoPrev ? ui.textTitle : ui.textTertiary} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.periodCenterPressable, pressed && styles.periodCenterPressablePressed]}
            onPress={onOpenPicker}
          >
            <Text style={styles.periodCenterLabel}>{periodLabel}</Text>
            <Ionicons name="chevron-down" size={18} color={ui.textSecondary} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.periodArrowBtn,
              { borderColor: ui.border },
              !canGoNext && styles.periodArrowBtnDisabled,
              pressed && canGoNext && styles.periodArrowBtnPressed,
            ]}
            onPress={onNext}
            disabled={!canGoNext}
          >
            <Ionicons name="chevron-forward" size={22} color={canGoNext ? ui.textTitle : ui.textTertiary} />
          </Pressable>
        </View>
      </View>
      <View style={[styles.periodTabsHairline, { backgroundColor: ui.border }]} />
      <View style={styles.periodTabsRow}>
        {(['sorties', 'entrees', 'recurrences', 'projets'] as const).map((tab) => {
          const active = activeTab === tab;
          const label =
            tab === 'sorties' ? t('depenses.tabSorties')
              : tab === 'entrees' ? t('depenses.tabEntrees')
                : tab === 'recurrences' ? t('depenses.tabRecurrences')
                  : t('depenses.tabProjets');
          return (
            <Pressable
              key={tab}
              style={[styles.periodTabBtn, active && styles.periodTabBtnActive]}
              onPress={() => { animateLayoutEase(); onChangeTab(tab); }}
            >
              <Text style={[styles.periodTabLabel, active && styles.periodTabLabelActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
