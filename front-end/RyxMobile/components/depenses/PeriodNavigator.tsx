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
  periodLabel: string;
  onOpenPicker: () => void;
  activeTab: MainTab;
  onChangeTab: (tab: MainTab) => void;
  topInset: number;
  onBack: () => void;
}

export function PeriodNavigator({
  styles,
  periodLabel,
  onOpenPicker,
  activeTab,
  onChangeTab,
  topInset,
  onBack,
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
              pressed && styles.periodArrowBtnPressed,
            ]}
            onPress={onBack}
          >
            <Ionicons name="chevron-back" size={22} color={ui.textTitle} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.periodCenterPressable, pressed && styles.periodCenterPressablePressed]}
            onPress={onOpenPicker}
          >
            <Text style={styles.periodCenterLabel}>{periodLabel}</Text>
            <Ionicons name="chevron-down" size={18} color={ui.textSecondary} />
          </Pressable>
          {/* Spacer to center the picker */}
          <View style={{ width: 40 }} />
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
