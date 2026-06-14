import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from '../../hooks/useTranslation';
import type { DepensesStyles } from './depensesStyles';
import type { RecurringCadence } from '../../services/recurring';

interface CadenceSelectorProps {
  styles: DepensesStyles;
  value: RecurringCadence;
  onChange: (c: RecurringCadence) => void;
  flow?: 'in' | 'out';
  disabled?: boolean;
}

export function CadenceSelector({ styles, value, onChange, flow = 'out', disabled }: CadenceSelectorProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.recurringCadenceToggle}>
      {(['day', 'week', 'month'] as const).map((c) => {
        const active = value === c;
        const activeOut = active && flow === 'out';
        const activeIn = active && flow === 'in';
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
              styles.recurringCadenceChip,
              activeOut && styles.recurringCadenceChipActiveOut,
              activeIn && styles.recurringCadenceChipActiveIn,
              pressed && styles.recurringFlowChipPressed,
            ]}
            onPress={() => !disabled && onChange(c)}
            disabled={disabled}
          >
            <Text
              style={[
                styles.recurringCadenceChipText,
                active && styles.recurringFlowChipTextActive,
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
