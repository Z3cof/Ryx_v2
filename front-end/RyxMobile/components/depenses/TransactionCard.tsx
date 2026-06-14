import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ExpenseItem } from '../../services/expenses';
import type { DepensesStyles } from './depensesStyles';

interface TransactionCardProps {
  item: ExpenseItem;
  flow: 'in' | 'out';
  styles: DepensesStyles;
  onLongPress: (item: ExpenseItem, flow: 'in' | 'out') => void;
  formatListDate: (raw: string) => string;
}

export function TransactionCard({
  item,
  flow,
  styles,
  onLongPress,
  formatListDate,
}: TransactionCardProps) {
  const isIncome = flow === 'in';

  return (
    <Pressable
      style={({ pressed }) => [
        isIncome ? styles.incomeCard : styles.expenseCard,
        pressed && styles.expenseCardPressed,
      ]}
      onLongPress={() => onLongPress(item, flow)}
    >
      <View style={isIncome ? styles.incomeCardIconWrap : styles.expenseIconWrap}>
        <Ionicons
          name={isIncome ? 'add-circle' : 'arrow-down-circle'}
          size={22}
          color={isIncome ? '#059669' : '#dc2626'}
        />
      </View>
      <View style={styles.expenseBody}>
        <Text style={styles.expenseTitle} numberOfLines={1}>
          {item.title}
        </Text>
        {item.desc ? (
          <Text style={styles.expenseDesc} numberOfLines={1}>
            {item.desc}
          </Text>
        ) : null}
        <Text style={styles.expenseDate}>{formatListDate(item.date)}</Text>
      </View>
      <Text style={isIncome ? styles.incomeCardAmount : styles.expenseAmount}>
        {item.amount}
      </Text>
    </Pressable>
  );
}
