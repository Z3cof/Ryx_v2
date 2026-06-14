import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar, type StatusBarStyle } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { deleteAccount } from '../../services/auth';
import { clearAuthToken } from '../../services/authSession';

const GRID_PADDING = 20;

function makeProfilHubStyles(
  ui: ReturnType<typeof import('../../theme').getUi>,
  primary: (typeof import('../../theme').colors)['primary'],
  spacing: typeof import('../../theme').spacing,
  radius: typeof import('../../theme').radius,
  fontSize: typeof import('../../theme').fontSize,
  colors: typeof import('../../theme').colors
) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: ui.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing[5],
    },
    backBtn: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: fontSize.lg,
      fontWeight: '700',
      color: ui.textPrimary,
    },
    hint: {
      fontSize: fontSize.sm,
      color: ui.textSecondary,
      lineHeight: 20,
      marginBottom: spacing[6],
    },
    card: {
      backgroundColor: ui.surface,
      borderRadius: radius.xl,
      marginBottom: spacing[6],
      borderWidth: 1,
      borderColor: ui.border,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[4],
    },
    rowPressed: { backgroundColor: ui.rowPressed },
    rowIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: primary.bg,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing[3],
    },
    rowBody: { flex: 1 },
    rowTitle: { fontSize: fontSize.base, fontWeight: '600', color: ui.textTitle },
    rowSub: { fontSize: fontSize.xs, color: ui.textSecondary, marginTop: 2 },
    separator: { height: 1, backgroundColor: ui.border, marginLeft: spacing[4] + 40 + spacing[3] },
    sectionLabel: {
      fontSize: fontSize.xs,
      fontWeight: '700',
      color: ui.textSecondary,
      marginBottom: spacing[2],
      marginTop: spacing[2],
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    btnPressed: { opacity: 0.92 },
    deleteRowIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: 'rgba(220,38,38,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing[3],
    },
    deleteRowTitle: { fontSize: fontSize.base, fontWeight: '700', color: '#b91c1c' },
    deleteRowSub: { fontSize: fontSize.xs, color: ui.textSecondary, marginTop: 2 },
    deleteModalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
    deleteModalSheet: {
      backgroundColor: ui.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: spacing[4],
      paddingTop: spacing[5],
      borderWidth: 1,
      borderColor: ui.border,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
        },
        android: { elevation: 16 },
      }),
    },
    deleteModalTitle: {
      fontSize: fontSize.lg,
      fontWeight: '800',
      color: ui.textTitle,
      marginBottom: spacing[2],
    },
    deleteModalBody: {
      fontSize: fontSize.sm,
      color: ui.textSecondary,
      marginBottom: spacing[4],
      lineHeight: 20,
    },
    deleteModalInput: {
      borderWidth: 1,
      borderColor: ui.border,
      borderRadius: radius.lg,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      fontSize: fontSize.base,
      color: ui.textPrimary,
      marginBottom: spacing[4],
    },
    deleteModalActions: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[2] },
    deleteModalBtnSecondary: {
      flex: 1,
      paddingVertical: spacing[3],
      alignItems: 'center',
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: ui.border,
      backgroundColor: ui.surface,
    },
    deleteModalBtnDestructive: {
      flex: 1,
      paddingVertical: spacing[3],
      alignItems: 'center',
      borderRadius: radius.lg,
      backgroundColor: '#b91c1c',
    },
    deleteModalBtnSecondaryText: { fontWeight: '700', fontSize: fontSize.sm, color: ui.textTitle },
    deleteModalBtnDestructiveText: { fontWeight: '700', fontSize: fontSize.sm, color: colors.white },
    saveBtn: {
      backgroundColor: primary.main,
      paddingVertical: spacing[3],
      borderRadius: radius.lg,
      alignItems: 'center',
    },
    saveBtnText: { color: '#fff', fontWeight: '600', fontSize: fontSize.base },
  });
}

export default function MesInformationsScreen() {
  const params = useLocalSearchParams<{ userId?: string }>();
  const insets = useSafeAreaInsets();
  const userId = params.userId || '';
  const { ui, primary, spacing, radius, fontSize, colors } = useAppTheme();
  const { t } = useTranslation();
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deleteAccountPassword, setDeleteAccountPassword] = useState('');
  const [deleteAccountBusy, setDeleteAccountBusy] = useState(false);

  const styles = useMemo(
    () => makeProfilHubStyles(ui, primary, spacing, radius, fontSize, colors),
    [ui, primary, spacing, radius, fontSize, colors]
  );

  const promptDeleteAccount = useCallback(() => {
    if (!userId || deleteAccountBusy) return;
    Alert.alert(t('parametres.deleteAccountAlertTitle'), t('parametres.deleteAccountAlertBody'), [
      { text: t('parametres.cancel'), style: 'cancel' },
      {
        text: t('parametres.deleteAccountContinue'),
        style: 'destructive',
        onPress: () => {
          setDeleteAccountPassword('');
          setDeleteAccountOpen(true);
        },
      },
    ]);
  }, [userId, deleteAccountBusy, t]);

  const confirmDeleteAccount = useCallback(async () => {
    if (!userId || deleteAccountBusy) return;
    const pwd = deleteAccountPassword.trim();
    if (!pwd) {
      Alert.alert(t('parametres.error'), t('parametres.deleteAccountPasswordRequired'));
      return;
    }
    setDeleteAccountBusy(true);
    try {
      await deleteAccount(userId, pwd);
      setDeleteAccountOpen(false);
      setDeleteAccountPassword('');
      await clearAuthToken();
      router.replace('/auth/login');
    } catch (e) {
      Alert.alert(t('parametres.error'), e instanceof Error ? e.message : t('parametres.tryAgain'));
    } finally {
      setDeleteAccountBusy(false);
    }
  }, [userId, deleteAccountBusy, deleteAccountPassword, t]);

  const gradientColors = ui.gradient as [string, string, string];

  if (!userId) {
    return (
      <View style={styles.root}>
        <StatusBar style={ui.statusBar as StatusBarStyle} />
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} locations={[0, 0.35, 1]} />
        <View style={[styles.centered, { paddingHorizontal: GRID_PADDING }]}>
          <Text style={{ color: ui.textSecondary, textAlign: 'center', marginBottom: spacing[4] }}>
            {t('profil.invalidSessionHub')}
          </Text>
          <Pressable style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.9 }]} onPress={() => router.back()}>
            <Text style={styles.saveBtnText}>{t('profil.back')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style={ui.statusBar as StatusBarStyle} />
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} locations={[0, 0.35, 1]} />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing[4],
          paddingHorizontal: GRID_PADDING,
          paddingBottom: spacing[10],
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]} onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color={ui.textTitle} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {t('profil.hubTitle')}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => router.push({ pathname: '/screen/profil-coordonnees', params: { userId } })}
          >
            <View style={styles.rowIcon}>
              <Ionicons name="person-outline" size={22} color={primary.main} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>{t('profil.rowPersonal')}</Text>
              <Text style={styles.rowSub}>{t('profil.rowPersonalSub')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={ui.textTertiary} />
          </Pressable>
          <View style={styles.separator} />
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => router.push({ pathname: '/screen/changer-mot-de-passe', params: { userId } })}
          >
            <View style={styles.rowIcon}>
              <Ionicons name="key-outline" size={22} color={primary.main} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>{t('profil.rowPassword')}</Text>
              <Text style={styles.rowSub}>{t('profil.rowPasswordSub')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={ui.textTertiary} />
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>{t('parametres.sectionDanger')}</Text>
        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={promptDeleteAccount}
            disabled={deleteAccountBusy}
          >
            <View style={styles.deleteRowIcon}>
              <Ionicons name="trash-outline" size={22} color="#b91c1c" />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.deleteRowTitle}>{t('parametres.deleteAccountRow')}</Text>
              <Text style={styles.deleteRowSub}>{t('parametres.deleteAccountRowSub')}</Text>
            </View>
            {deleteAccountBusy ? (
              <ActivityIndicator size="small" color="#b91c1c" />
            ) : (
              <Ionicons name="chevron-forward" size={20} color={ui.textTertiary} />
            )}
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={deleteAccountOpen}
        animationType="slide"
        transparent
        onRequestClose={() => !deleteAccountBusy && setDeleteAccountOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.deleteModalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => !deleteAccountBusy && setDeleteAccountOpen(false)}
          />
          <View style={[styles.deleteModalSheet, { paddingBottom: insets.bottom + spacing[4] }]}>
            <Text style={styles.deleteModalTitle}>{t('parametres.deleteAccountModalTitle')}</Text>
            <Text style={styles.deleteModalBody}>{t('parametres.deleteAccountModalBody')}</Text>
            <TextInput
              style={styles.deleteModalInput}
              value={deleteAccountPassword}
              onChangeText={setDeleteAccountPassword}
              placeholder={t('parametres.deleteAccountPasswordPlaceholder')}
              placeholderTextColor={ui.textTertiary}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!deleteAccountBusy}
            />
            <View style={styles.deleteModalActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.deleteModalBtnSecondary,
                  pressed && styles.btnPressed,
                  deleteAccountBusy && { opacity: 0.6 },
                ]}
                onPress={() => !deleteAccountBusy && setDeleteAccountOpen(false)}
                disabled={deleteAccountBusy}
              >
                <Text style={styles.deleteModalBtnSecondaryText}>
                  {t('parametres.deleteAccountModalCancel')}
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.deleteModalBtnDestructive,
                  pressed && styles.btnPressed,
                  deleteAccountBusy && { opacity: 0.75 },
                ]}
                onPress={() => void confirmDeleteAccount()}
                disabled={deleteAccountBusy}
              >
                {deleteAccountBusy ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.deleteModalBtnDestructiveText}>
                    {t('parametres.deleteAccountSubmit')}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
