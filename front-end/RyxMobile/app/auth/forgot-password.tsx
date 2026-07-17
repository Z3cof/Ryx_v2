import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Localization from 'expo-localization';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar, type StatusBarStyle } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import {
  parsePhoneNumberFromString,
  getCountries,
  getCountryCallingCode,
  type CountryCode,
} from 'libphonenumber-js';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from '../../hooks/useTranslation';
import {
  resetPasswordWithToken,
  sendForgotPasswordCode,
  verifyForgotPasswordCode,
} from '../../services/auth';
import { CountryDialPickerModal } from '../../components/CountryDialPickerModal';

type Phase = 'phone' | 'otp' | 'password';

function defaultCountryIso(): CountryCode {
  return 'ML';
}

export default function ForgotPasswordScreen() {
  const { ui, colors, primary, spacing, radius, fontSize } = useAppTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: ui.background },
        flex: { flex: 1 },
        scroll: {
          flexGrow: 1,
          paddingHorizontal: spacing[6],
          paddingTop: spacing[6],
          paddingBottom: spacing[10],
        },
        backRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[3],
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: ui.border,
          backgroundColor: ui.background,
        },
        backLabel: { color: primary.link, fontSize: fontSize.sm, marginLeft: spacing[1] },
        title: {
          color: primary.link,
          fontSize: 22,
          fontWeight: '700',
          marginBottom: spacing[2],
        },
        subtitle: {
          color: ui.textSecondary,
          fontSize: fontSize.sm,
          lineHeight: 20,
          marginBottom: spacing[5],
        },
        label: {
          color: ui.textTitle,
          fontSize: fontSize.sm,
          fontWeight: '500',
          marginBottom: spacing[2],
          marginTop: spacing[3],
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
        // Rangée sélecteur pays + numéro national
        phoneRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[2],
        },
        countryBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: spacing[3] + 2,
          paddingHorizontal: spacing[3],
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: ui.border,
          backgroundColor: ui.surfaceMuted,
          gap: spacing[1],
        },
        countryBtnText: {
          color: ui.textPrimary,
          fontSize: fontSize.sm,
          fontWeight: '600',
        },
        nationalInput: { flex: 1, minWidth: 0 },
        otpInput: {
          letterSpacing: 6,
          textAlign: 'center',
          fontSize: 22,
          fontWeight: '600',
        },
        devHint: {
          marginTop: spacing[3],
          color: ui.textSecondary,
          fontSize: fontSize.sm,
          textAlign: 'center',
        },
        error: {
          color: '#dc2626',
          fontSize: fontSize.sm,
          marginTop: spacing[3],
        },
        primaryBtn: {
          marginTop: spacing[6],
          backgroundColor: primary.main,
          borderRadius: radius.md,
          paddingVertical: spacing[4],
          alignItems: 'center',
        },
        primaryBtnDisabled: { opacity: 0.6 },
        primaryBtnText: { color: colors.white, fontWeight: '600', fontSize: fontSize.base },
        secondaryBtn: {
          marginTop: spacing[4],
          alignItems: 'center',
          paddingVertical: spacing[2],
        },
        secondaryBtnText: { color: primary.link, fontSize: fontSize.sm, fontWeight: '600' },
      }),
    [ui, colors, primary, spacing, radius, fontSize]
  );

  const [phase, setPhase] = useState<Phase>('phone');

  // Sélecteur de pays + numéro national (phase 'phone')
  const [countryIso, setCountryIso] = useState<CountryCode>(defaultCountryIso);
  const [nationalPhone, setNationalPhone] = useState('');
  const [countryModalVisible, setCountryModalVisible] = useState(false);

  // phoneE164 calculé dynamiquement depuis le numéro national + pays
  const computedPhoneE164 = useMemo(() => {
    const raw = nationalPhone.replace(/\s/g, '');
    if (!raw) return null;
    const p = raw.startsWith('+')
      ? parsePhoneNumberFromString(raw)
      : parsePhoneNumberFromString(raw, countryIso);
    if (!p?.isValid()) return null;
    return p.format('E.164');
  }, [nationalPhone, countryIso]);

  const [confirmedPhoneE164, setConfirmedPhoneE164] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const subtitle =
    phase === 'phone'
      ? t('auth.forgotSubtitleEmail')
      : phase === 'otp'
        ? t('auth.forgotSubtitleOtp')
        : t('auth.forgotSubtitleNewPwd');

  const handleSendCode = async () => {
    if (!computedPhoneE164) {
      setError(t('auth.forgotErrEmail'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await sendForgotPasswordCode(computedPhoneE164);
      setConfirmedPhoneE164(computedPhoneE164);
      setDevOtpHint(res.devOtp ?? null);
      setOtpCode('');
      setPhase('otp');
    } catch (e) {
      const err = e as Error & { detail?: string };
      setError(err.detail ? `${err.message} (${err.detail})` : err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!/^\d{6}$/.test(otpCode)) {
      setError(t('auth.forgotErrOtp'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await verifyForgotPasswordCode(confirmedPhoneE164, otpCode);
      setResetToken(res.resetToken);
      setPhase('password');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (newPassword.length < 6) {
      setError(t('auth.forgotErrPwdShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('auth.forgotErrPwdMismatch'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await resetPasswordWithToken(confirmedPhoneE164, resetToken, newPassword);
      Alert.alert(t('auth.forgotTitle'), t('auth.forgotSuccess'), [
        { text: 'OK', onPress: () => router.replace('/auth/login') },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await sendForgotPasswordCode(confirmedPhoneE164);
      setDevOtpHint(res.devOtp ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style={ui.statusBar as StatusBarStyle} />

      {/* Header fixe avec bouton retour */}
      <View style={[styles.backRow, { paddingTop: insets.top + spacing[2] }]}>
        <Pressable
          style={{ flexDirection: 'row', alignItems: 'center' }}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={22} color={primary.main} />
          <Text style={styles.backLabel}>{t('auth.forgotBackLogin')}</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <Text style={styles.title}>{t('auth.forgotTitle')}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          {/* Phase 1 : Saisie du numéro avec sélecteur de pays */}
          {phase === 'phone' ? (
            <>
              <Text style={styles.label}>Numéro WhatsApp</Text>
              <View style={styles.phoneRow}>
                <Pressable
                  style={styles.countryBtn}
                  onPress={() => setCountryModalVisible(true)}
                  hitSlop={4}
                >
                  <Text style={styles.countryBtnText}>
                    {countryIso} +{getCountryCallingCode(countryIso)}
                  </Text>
                </Pressable>
                <TextInput
                  style={[styles.input, styles.nationalInput]}
                  placeholder="73 65 16 93"
                  placeholderTextColor={ui.textTertiary}
                  value={nationalPhone}
                  onChangeText={setNationalPhone}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </>
          ) : null}

          {/* Phase 2 : Saisie du code OTP */}
          {phase === 'otp' ? (
            <>
              <Text style={styles.label}>{t('auth.registerOtpLabel')}</Text>
              <TextInput
                style={[styles.input, styles.otpInput]}
                placeholder="000000"
                placeholderTextColor={ui.textTertiary}
                value={otpCode}
                onChangeText={(v) => setOtpCode(v.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
              {devOtpHint ? (
                <Text style={styles.devHint}>{t('auth.registerDevOtpHint', { code: devOtpHint })}</Text>
              ) : null}
            </>
          ) : null}

          {/* Phase 3 : Nouveau mot de passe */}
          {phase === 'password' ? (
            <>
              <Text style={styles.label}>{t('auth.forgotNewPassword')}</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={ui.textTertiary}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />
              <Text style={styles.label}>{t('auth.forgotConfirmPassword')}</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={ui.textTertiary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
            onPress={
              phase === 'phone'
                ? handleSendCode
                : phase === 'otp'
                  ? handleVerifyOtp
                  : handleReset
            }
            disabled={loading || (phase === 'phone' && !computedPhoneE164)}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {phase === 'phone'
                  ? t('auth.forgotSendCode')
                  : phase === 'otp'
                    ? t('auth.forgotVerifyCode')
                    : t('auth.forgotReset')
                }
              </Text>
            )}
          </Pressable>

          {phase === 'otp' ? (
            <Pressable style={styles.secondaryBtn} onPress={handleResend} disabled={loading}>
              <Text style={styles.secondaryBtnText}>{t('auth.forgotResend')}</Text>
            </Pressable>
          ) : null}

        </ScrollView>
      </KeyboardAvoidingView>

      <CountryDialPickerModal
        visible={countryModalVisible}
        onClose={() => setCountryModalVisible(false)}
        onSelect={(iso) => setCountryIso(iso)}
        selectedIso={countryIso}
        localeTag="fr-FR"
        title="Choisir un pays"
        searchPlaceholder="Rechercher un pays..."
      />
    </View>
  );
}
