import React from 'react';
import { View, Text, Pressable, ScrollView, Modal } from 'react-native';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from '../../hooks/useTranslation';
import type { DepensesStyles } from './depensesStyles';

interface MonthPickerModalProps {
  styles: DepensesStyles;
  visible: boolean;
  onClose: () => void;
  selectedYear: number;
  selectedMonth: number;
  onSelectYear: (y: number) => void;
  onSelectMonth: (m: number) => void;
  currentYear: number;
  currentMonth: number;
  yearOptions: number[];
  monthNames: string[];
}

export function MonthPickerModal({
  styles, visible, onClose, selectedYear, selectedMonth,
  onSelectYear, onSelectMonth, currentYear, currentMonth,
  yearOptions, monthNames,
}: MonthPickerModalProps) {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.pickerOverlay} onPress={onClose}>
        <View style={styles.pickerCard} onStartShouldSetResponder={() => true}>
          <Text style={styles.pickerTitle}>{t('depenses.pickMonth')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.pickerYearStrip}
            contentContainerStyle={styles.pickerYearStripContent}
            keyboardShouldPersistTaps="handled"
          >
            {yearOptions.map((y) => {
              const ySelected = selectedYear === y;
              return (
                <Pressable
                  key={y}
                  style={[styles.pickerYearChip, ySelected && styles.pickerYearChipActive]}
                  onPress={() => onSelectYear(y)}
                >
                  <Text style={[styles.pickerYearChipText, ySelected && styles.pickerYearChipTextActive]}>
                    {y}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <ScrollView style={styles.pickerScroll} keyboardShouldPersistTaps="handled">
            {monthNames.map((name, i) => {
              const monthNum = i + 1;
              const isSelected = selectedMonth === monthNum;
              const monthInFuture = selectedYear === currentYear && monthNum > currentMonth;
              return (
                <Pressable
                  key={monthNum}
                  style={[
                    styles.pickerOption,
                    isSelected && styles.pickerOptionActive,
                    monthInFuture && styles.pickerOptionDisabled,
                  ]}
                  disabled={monthInFuture}
                  onPress={() => { onSelectMonth(monthNum); onClose(); }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      isSelected && styles.pickerOptionTextActive,
                      monthInFuture && styles.pickerOptionTextDisabled,
                    ]}
                  >
                    {name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable style={styles.pickerCloseBtn} onPress={onClose}>
            <Text style={styles.pickerCloseText}>{t('depenses.close')}</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
