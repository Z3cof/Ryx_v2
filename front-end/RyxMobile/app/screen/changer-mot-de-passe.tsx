import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
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
import { changePassword } from '../../services/auth';

const GRID_PADDING = 20;

function makePwdScreenStyles(
  ui: ReturnType<typeof import('../../theme').getUi>,
  colors: typeof import('../../theme').colors,
  primary: (typeof import('../../theme').colors)['primary'],
  spacing: typeof import('../../theme').spacing,
  radius: typeof import('../../theme').radius,
  fontSize: typeof import('../../theme').fontSize
) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: ui.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: GRID_PADDING },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing[4],
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
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
      marginBottom: spacing[5],
    },
    label: {
      color: ui.textTitle,
      fontSize: fontSize.sm,
      fontWeight: '500',
      marginBottom: spacing[2],
      marginTop: spacing[2],
    },
    input: {
      backgroundColor: ui.surfaceMuted,
      borderRadius: radius.md,
      paddingVertical: spacing[3] + 2,
      paddingHorizontal: spacing[4],
      color: ui.textTitle,
      fontSize: fontSize.base,
      borderWidth: 1,
      borderColor: ui.border,
    },
    passwordWrap: { position: 'relative' },
    inputPassword: { paddingRight: 72 },
    eyeButton: {
      position: 'absolute',
      right: spacing[3],
      top: 0,
      bottom: 0,
      justifyContent: 'center',
    },
    eyeButtonText: {
      fontSize: fontSize.xs,
      color: ui.textSecondary,
      fontWeight: '500',
    },
    pwdError: {
      color: '#dc2626',
      fontSize: fontSize.sm,
      marginTop: spacing[3],
      textAlign: 'center',
    },
    saveBtn: {
      backgroundColor: primary.main,
      paddingVertical: spacing[4],
      borderRadius: radius.lg,
      alignItems: 'center',
      marginTop: spacing[6],
    },
    saveBtnPressed: { opacity: 0.92 },
    saveBtnDisabled: { opacity: 0.7 },
    saveBtnText: {
      color: colors.white,
      fontSize: fontSize.base,
      fontWeight: '600',
    },
  });
}

export default function ChangerMotDePasseScreen() {
  const params = useLocalSearchParams<{ userId?: string }>();
  const insets = useSafeAreaInsets();
  const userId = params.userId || '';
  const { ui, colors, primary, spacing, radius, fontSize } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(
    () => makePwdScreenStyles(ui, colors, primary, spacing, radius, fontSize),
    [ui, colors, primary, spacing, radius, fontSize]
  );

  const gradientColors = ui.gradient as [string, string, string];

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [savingPwd, setSavingPwd] = useState(false);

  const handleChangePassword = async () => {
    if (!userId) return;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwdError(t('profil.errFillAll'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError(t('profil.errPwdMismatch'));
      return;
    }
    if (newPassword.length < 6) {
      setPwdError(t('profil.errPwdShort'));
      return;
    }
    if (newPassword === currentPassword) {
      setPwdError(t('profil.errPwdSame'));
      return;
    }
    setPwdError(null);
    setSavingPwd(true);
    try {
      await changePassword(userId, currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert(t('profil.pwdSuccessTitle'), t('profil.pwdSuccessBody'), [
        { text: t('profil.ok'), onPress: () => router.back() },
      ]);
    } catch (err) {
      setPwdError(err instanceof Error ? err.message : t('profil.pwdChangeError'));
    } finally {
      setSavingPwd(false);
    }
  };

  if (!userId) {
    return (
      <View style={styles.root}>
        <StatusBar style={ui.statusBar as StatusBarStyle} />
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} locations={[0, 0.35, 1]} />
        <View style={styles.centered}>
          <Text style={{ color: ui.textSecondary, textAlign: 'center', marginBottom: spacing[4] }}>
            {t('profil.invalidSession')}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed]}
            onPress={() => router.back()}
          >
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

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + spacing[4],
            paddingHorizontal: GRID_PADDING,
            paddingBottom: spacing[10],
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <Pressable
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
              onPress={() => router.back()}
              hitSlop={12}
            >
              <Ionicons name="chevron-back" size={26} color={ui.textTitle} />
            </Pressable>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {t('profil.pwdTitle')}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <Text style={styles.hint}>{t('profil.pwdHint')}</Text>

          <Text style={styles.label}>{t('profil.currentPwd')}</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              style={[styles.input, styles.inputPassword]}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="••••••••"
              placeholderTextColor={ui.textTertiary}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable style={styles.eyeButton} onPress={() => setShowPassword((v: boolean) => !v)} hitSlop={8}>
              <Text style={styles.eyeButtonText}>
                {showPassword ? t('profil.hidePwd') : t('profil.showPwd')}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.label}>{t('profil.newPwd')}</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder={t('profil.newPwdPlaceholder')}
            placeholderTextColor={ui.textTertiary}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>{t('profil.confirmNewPwd')}</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="••••••••"
            placeholderTextColor={ui.textTertiary}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {pwdError ? <Text style={styles.pwdError}>{pwdError}</Text> : null}

          <Pressable
            style={({ pressed }) => [
              styles.saveBtn,
              pressed && !savingPwd && styles.saveBtnPressed,
              savingPwd && styles.saveBtnDisabled,
            ]}
            onPress={() => void handleChangePassword()}
            disabled={savingPwd}
          >
            {savingPwd ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.saveBtnText}>{t('profil.updatePwd')}</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
