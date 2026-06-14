import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Localization from 'expo-localization';
import { Ionicons } from '@expo/vector-icons';
import {
  parsePhoneNumberFromString,
  getCountryCallingCode,
  getCountries,
  type CountryCode,
} from 'libphonenumber-js';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { sendWhatsappOtp, verifyWhatsappOtp, updateUserPhone } from '../services/auth';
import { CountryDialPickerModal } from './CountryDialPickerModal';

function defaultCountryIso(): CountryCode {
  const r = Localization.getLocales()[0]?.regionCode;
  if (r && getCountries().includes(r as CountryCode)) return r as CountryCode;
  return 'FR';
}

function initialStateFromE164(phoneE164: string | undefined): { country: CountryCode; national: string } {
  if (!phoneE164?.trim()) {
    return { country: defaultCountryIso(), national: '' };
  }
  const p = parsePhoneNumberFromString(phoneE164.trim());
  if (p?.isValid() && p.country) {
    return { country: p.country, national: p.format('NATIONAL') };
  }
  return { country: defaultCountryIso(), national: '' };
}

type Props = {
  visible: boolean;
  onClose: () => void;
  userId: string;
  currentPhoneE164: string | undefined;
  localeTag: string;
  onPhoneUpdated: () => void;
};

export function ChangePhoneModal({
  visible,
  onClose,
  userId,
  currentPhoneE164,
  localeTag,
  onPhoneUpdated,
}: Props) {
  const { ui, colors, primary, spacing, radius, fontSize } = useAppTheme();
  const { t } = useTranslation();

  const [countryIso, setCountryIso] = useState<CountryCode>(defaultCountryIso);
  const [nationalPhone, setNationalPhone] = useState('');
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    const init = initialStateFromE164(currentPhoneE164);
    setCountryIso(init.country);
    setNationalPhone(init.national);
    setOtpCode('');
    setError(null);
  }, [visible, currentPhoneE164]);

  const phoneE164 = useMemo(() => {
    const raw = nationalPhone.replace(/\s/g, '');
    if (!raw) return null;
    const p = raw.startsWith('+')
      ? parsePhoneNumberFromString(raw)
      : parsePhoneNumberFromString(raw, countryIso);
    if (!p?.isValid()) return null;
    return p.format('E.164');
  }, [nationalPhone, countryIso]);

  const canSendOtp = !!phoneE164 && phoneE164 !== currentPhoneE164?.trim();

  const handleSendOtp = async () => {
    if (!phoneE164 || !canSendOtp) {
      setError(t('profil.phoneErrInvalid'));
      return;
    }
    setError(null);
    setSendingOtp(true);
    try {
      await sendWhatsappOtp(phoneE164);
      Alert.alert(
        t('profil.phoneCodeSentTitle'),
        t('profil.phoneCodeSentBody')
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t('profil.phoneErrSend'));
    } finally {
      setSendingOtp(false);
    }
  };

  const handleConfirm = async () => {
    if (!phoneE164 || !canSendOtp) {
      setError(t('profil.phoneErrInvalid'));
      return;
    }
    const code = otpCode.replace(/\s/g, '');
    if (!/^\d{6}$/.test(code)) {
      setError(t('profil.phoneErrOtpFormat'));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const { verificationToken } = await verifyWhatsappOtp(phoneE164, code);
      await updateUserPhone(userId, phoneE164, verificationToken);
      onPhoneUpdated();
      Alert.alert(t('profil.phoneSavedTitle'), t('profil.phoneSavedBody'), [
        { text: t('profil.ok'), onPress: onClose },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('profil.phoneErrSave'));
    } finally {
      setSubmitting(false);
    }
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          justifyContent: 'flex-end',
        },
        sheet: {
          backgroundColor: ui.surface,
          borderTopLeftRadius: radius.xl + 4,
          borderTopRightRadius: radius.xl + 4,
          paddingHorizontal: spacing[5],
          paddingTop: spacing[4],
          paddingBottom: spacing[8],
          maxHeight: '92%',
          borderWidth: 1,
          borderColor: ui.border,
        },
        grab: {
          alignSelf: 'center',
          width: 40,
          height: 4,
          borderRadius: 2,
          backgroundColor: ui.border,
          marginBottom: spacing[4],
        },
        title: {
          fontSize: fontSize.lg,
          fontWeight: '700',
          color: ui.textTitle,
          marginBottom: spacing[2],
        },
        sub: {
          fontSize: fontSize.sm,
          color: ui.textSecondary,
          marginBottom: spacing[4],
          lineHeight: 20,
        },
        label: {
          color: ui.textTitle,
          fontSize: fontSize.sm,
          fontWeight: '500',
          marginBottom: spacing[2],
          marginTop: spacing[2],
        },
        phoneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
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
        countryBtnText: { color: ui.textPrimary, fontSize: fontSize.sm, fontWeight: '600' },
        input: {
          flex: 1,
          minWidth: 0,
          backgroundColor: ui.surfaceMuted,
          borderRadius: radius.md,
          paddingVertical: spacing[3] + 2,
          paddingHorizontal: spacing[4],
          color: ui.textTitle,
          fontSize: fontSize.base,
          borderWidth: 1,
          borderColor: ui.border,
        },
        otpInput: {
          backgroundColor: ui.surfaceMuted,
          borderRadius: radius.md,
          paddingVertical: spacing[3] + 2,
          paddingHorizontal: spacing[4],
          color: ui.textTitle,
          fontSize: fontSize.lg,
          letterSpacing: 6,
          textAlign: 'center',
          borderWidth: 1,
          borderColor: ui.border,
        },
        primaryBtn: {
          backgroundColor: primary.main,
          paddingVertical: spacing[4],
          borderRadius: radius.lg,
          alignItems: 'center',
          marginTop: spacing[4],
        },
        primaryBtnDisabled: { opacity: 0.65 },
        primaryBtnText: { color: colors.white, fontWeight: '600', fontSize: fontSize.base },
        secondaryBtn: {
          marginTop: spacing[2],
          paddingVertical: spacing[3],
          alignItems: 'center',
        },
        secondaryBtnText: { color: primary.main, fontWeight: '600', fontSize: fontSize.sm },
        error: { color: '#dc2626', fontSize: fontSize.sm, marginTop: spacing[3] },
        closeRow: {
          flexDirection: 'row',
          justifyContent: 'flex-end',
          marginBottom: spacing[2],
        },
      }),
    [ui, colors, primary, spacing, radius, fontSize]
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grab} />
          <View style={styles.closeRow}>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={28} color={ui.textSecondary} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>{t('profil.phoneModalTitle')}</Text>
            <Text style={styles.sub}>{t('profil.phoneModalSub')}</Text>

            <Text style={styles.label}>{t('profil.phoneLabel')}</Text>
            <View style={styles.phoneRow}>
              <Pressable style={styles.countryBtn} onPress={() => setCountryModalVisible(true)}>
                <Text style={styles.countryBtnText}>
                  {countryIso} +{getCountryCallingCode(countryIso)}
                </Text>
                <Ionicons name="chevron-down" size={16} color={ui.textSecondary} />
              </Pressable>
              <TextInput
                style={styles.input}
                placeholder={t('profil.phoneNationalPlaceholder')}
                placeholderTextColor={ui.textTertiary}
                value={nationalPhone}
                onChangeText={setNationalPhone}
                keyboardType="phone-pad"
              />
            </View>

            <Text style={styles.label}>{t('profil.phoneOtpLabel')}</Text>
            <TextInput
              style={styles.otpInput}
              placeholder="000000"
              placeholderTextColor={ui.textTertiary}
              value={otpCode}
              onChangeText={(x) => setOtpCode(x.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                (!canSendOtp || sendingOtp) && styles.primaryBtnDisabled,
                pressed && canSendOtp && !sendingOtp && { opacity: 0.92 },
              ]}
              onPress={() => void handleSendOtp()}
              disabled={!canSendOtp || sendingOtp}
            >
              {sendingOtp ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.primaryBtnText}>{t('profil.phoneSendCode')}</Text>
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                (!phoneE164 || submitting) && styles.primaryBtnDisabled,
                { marginTop: spacing[3] },
                pressed && phoneE164 && !submitting && { opacity: 0.92 },
              ]}
              onPress={() => void handleConfirm()}
              disabled={!phoneE164 || submitting}
            >
              {submitting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.primaryBtnText}>{t('profil.phoneConfirm')}</Text>
              )}
            </Pressable>

            <Pressable style={styles.secondaryBtn} onPress={onClose}>
              <Text style={styles.secondaryBtnText}>{t('profil.cancel')}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      <CountryDialPickerModal
        visible={countryModalVisible}
        onClose={() => setCountryModalVisible(false)}
        onSelect={(iso) => setCountryIso(iso)}
        selectedIso={countryIso}
        localeTag={localeTag}
        title={t('auth.registerCountryTitle')}
        searchPlaceholder={t('auth.registerSearchCountry')}
      />
    </Modal>
  );
}
