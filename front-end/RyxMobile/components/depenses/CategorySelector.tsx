import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from '../../hooks/useTranslation';
import type { DepensesStyles } from './depensesStyles';

interface CategoryItem {
  id: string;
  icon: string;
  labelKey: string;
}

interface CategorySelectorProps {
  categories: readonly CategoryItem[];
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  submitting: boolean;
  styles: DepensesStyles;
}

export function CategorySelector({
  categories,
  selectedCategoryId,
  onSelectCategory,
  submitting,
  styles,
}: CategorySelectorProps) {
  const { ui, colors } = useAppTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.categoryGrid}>
      {categories.map((cat) => {
        const isActive = selectedCategoryId === cat.id;
        return (
          <Pressable
            key={cat.id}
            style={[styles.categoryChip, isActive && styles.categoryChipActive]}
            onPress={() => !submitting && onSelectCategory(cat.id)}
            disabled={submitting}
          >
            <Ionicons
              name={cat.icon as keyof typeof Ionicons.glyphMap}
              size={18}
              color={isActive ? colors.white : ui.textSecondary}
            />
            <Text
              style={[
                styles.categoryChipText,
                isActive && styles.categoryChipTextActive,
              ]}
              numberOfLines={1}
            >
              {t(cat.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
