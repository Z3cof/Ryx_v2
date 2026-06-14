import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCountries, getCountryCallingCode, type CountryCode } from 'libphonenumber-js';
import { useAppTheme } from '../hooks/useAppTheme';

export type CountryDialRow = { iso: CountryCode; dial: string; name: string };

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (iso: CountryCode) => void;
  selectedIso: CountryCode;
  localeTag: string;
  title: string;
  searchPlaceholder: string;
};

export function CountryDialPickerModal({
  visible,
  onClose,
  onSelect,
  selectedIso,
  localeTag,
  title,
  searchPlaceholder,
}: Props) {
  const { ui, primary, spacing, radius, fontSize } = useAppTheme();
  const [query, setQuery] = useState('');

  const countries = useMemo(() => {
    const regionOf = (iso: string): string => {
      try {
        const Ctor = Intl.DisplayNames;
        if (typeof Ctor !== 'function') return iso;
        const dn = new Ctor([localeTag], { type: 'region' });
        return dn.of(iso) ?? iso;
      } catch {
        return iso;
      }
    };
    const list: CountryDialRow[] = getCountries()
      .map((iso) => ({
        iso,
        dial: getCountryCallingCode(iso),
        name: regionOf(iso),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, localeTag, { sensitivity: 'base' }));
    return list;
  }, [localeTag]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dial.includes(q) ||
        c.iso.toLowerCase().includes(q)
    );
  }, [countries, query]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
        card: {
          backgroundColor: ui.surface,
          borderTopLeftRadius: radius['2xl'],
          borderTopRightRadius: radius['2xl'],
          maxHeight: '88%',
          paddingBottom: spacing[6],
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[3],
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: ui.border,
        },
        headerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: ui.textTitle },
        search: {
          marginHorizontal: spacing[4],
          marginTop: spacing[2],
          marginBottom: spacing[2],
          paddingHorizontal: spacing[3],
          paddingVertical: spacing[2],
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: ui.border,
          color: ui.textPrimary,
          backgroundColor: ui.surfaceMuted,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[3],
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: ui.border,
        },
        rowActive: { backgroundColor: primary.bg },
        rowName: { flex: 1, color: ui.textPrimary, fontSize: fontSize.base },
        rowDial: { color: ui.textSecondary, fontSize: fontSize.sm, marginRight: spacing[2] },
        rowIso: { color: ui.textTertiary, fontSize: fontSize.xs, width: 28 },
      }),
    [ui, primary, spacing, radius, fontSize]
  );

  const select = useCallback(
    (iso: CountryCode) => {
      onSelect(iso);
      onClose();
      setQuery('');
    },
    [onSelect, onClose]
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={26} color={ui.textSecondary} />
            </Pressable>
          </View>
          <TextInput
            style={styles.search}
            placeholder={searchPlaceholder}
            placeholderTextColor={ui.textTertiary}
            value={query}
            onChangeText={setQuery}
          />
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.iso}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={20}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.row, item.iso === selectedIso && styles.rowActive]}
                onPress={() => select(item.iso)}
              >
                <Text style={styles.rowIso}>{item.iso}</Text>
                <Text style={styles.rowName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.rowDial}>+{item.dial}</Text>
              </Pressable>
            )}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
