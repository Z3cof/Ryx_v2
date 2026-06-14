import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  Animated,
  Easing,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { StatusBar, type StatusBarStyle } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { RyxLoader } from '../../components/RyxLoader';
import { register as apiRegister, sendWhatsappOtp, verifyWhatsappOtp } from '../../services/auth';
import { setPostRegisterCredentials } from '../../services/postRegisterSession';
import { getRegisterDraft, clearRegisterDraft } from '../../services/registerDraft';

function makeVerifyOtpStyles(
  ui: ReturnType<typeof import('../../theme').getUi>,
  colors: typeof import('../../theme').colors,
  primary: ReturnType<typeof useAppTheme>['primary'],
  spacing: typeof import('../../theme').spacing,
  radius: typeof import('../../theme').radius,
  fontSize: typeof import('../../theme').fontSize,
  isDark: boolean
) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: ui.background },
    loaderOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: ui.background,
      zIndex: 100,
      justifyContent: 'center',
      alignItems: 'center',
    },
    flex: { flex: 1 },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: spacing[6],
      paddingTop: spacing[6],
      paddingBottom: spacing[12],
    },
    backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing[4] },
    backLabel: { color: colors.primary.main, fontSize: fontSize.sm, fontWeight: '600', marginLeft: spacing[1] },
    card: {
      backgroundColor: ui.surface,
      borderRadius: radius.xl + 4,
      paddingVertical: spacing[8],
      paddingHorizontal: spacing[6],
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
      borderWidth: 1,
      borderColor: ui.border,
    },
    logoBox: {
      width: 48,
      height: 48,
      borderRadius: radius.md,
      backgroundColor: primary.bg,
      alignSelf: 'center',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing[5],
    },
    logoImage: { width: 36, height: 36 },
    title: {
      color: primary.link,
      fontSize: 22,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: spacing[2],
    },
    subtitle: {
      color: ui.textSecondary,
      fontSize: fontSize.sm,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: spacing[6],
    },
    label: {
      color: ui.textTitle,
      fontSize: fontSize.sm,
      fontWeight: '500',
      marginBottom: spacing[2],
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
      letterSpacing: 4,
      textAlign: 'center',
    },
    primaryButton: {
      backgroundColor: colors.primary.main,
      paddingVertical: spacing[4],
      borderRadius: radius.lg,
      marginTop: spacing[5],
    },
    primaryButtonPressed: { opacity: 0.9 },
    primaryButtonDisabled: {
      backgroundColor: isDark ? '#475569' : '#cbd5e1',
      opacity: 1,
    },
    primaryButtonText: {
      color: colors.white,
      fontSize: fontSize.base,
      fontWeight: '600',
      textAlign: 'center',
    },
    primaryButtonTextDisabled: {
      color: isDark ? '#94a3b8' : '#64748b',
    },
    secondaryButton: {
      marginTop: spacing[3],
      paddingVertical: spacing[3],
      borderRadius: radius.md,
      borderWidth: 2,
      borderColor: colors.primary.main,
      alignItems: 'center',
    },
    secondaryButtonText: { color: colors.primary.main, fontWeight: '600', fontSize: fontSize.sm },
    errorText: {
      color: '#dc2626',
      fontSize: fontSize.sm,
      marginTop: spacing[2],
      textAlign: 'center',
    },
    devOtpText: {
      marginTop: spacing[2],
      fontSize: fontSize.xs,
      color: ui.textSecondary,
      textAlign: 'center',
    },
  });
}

export default function RegisterVerifyOtpScreen() {
  const params = useLocalSearchParams<{ devOtp?: string }>();
  const devOtpFromParams = typeof params.devOtp === 'string' && params.devOtp ? params.devOtp : null;

  const { ui, colors, primary, spacing, radius, fontSize, isDark } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(
    () => makeVerifyOtpStyles(ui, colors, primary, spacing, radius, fontSize, isDark),
    [ui, colors, primary, spacing, radius, fontSize, isDark]
  );

  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const otpReady = otpCode.replace(/\s/g, '').length === 6;

  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentScale = useRef(new Animated.Value(0.96)).current;

  // Relance l'animation d'entrée à chaque fois que l'écran reprend le focus
  useFocusEffect(
    useCallback(() => {
      if (!getRegisterDraft()) {
        router.replace('/auth/register');
        return;
      }
      contentOpacity.setValue(0);
      contentScale.setValue(0.96);
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(contentScale, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, [])
  );

  const handleResend = async () => {
    const draft = getRegisterDraft();
    if (!draft) return;
    setError(null);
    setResending(true);
    try {
      await sendWhatsappOtp(draft.phoneE164, { email: draft.email });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur envoi code');
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async () => {
    const draft = getRegisterDraft();
    if (!draft) {
      router.replace('/auth/register');
      return;
    }
    const code = otpCode.replace(/\s/g, '');
    if (code.length !== 6) {
      setError(t('auth.registerErrPhoneInvalid'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { verificationToken } = await verifyWhatsappOtp(draft.phoneE164, code);
      const res = await apiRegister(
        draft.name,
        draft.email,
        draft.password,
        draft.phoneE164,
        verificationToken,
        draft.countryIso
      );
      clearRegisterDraft();
      setPostRegisterCredentials(draft.email, draft.password);
      router.replace({
        pathname: '/auth/est-vendeur',
        params: { userId: res.user._id, userName: res.user.name || draft.name },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style={ui.statusBar as StatusBarStyle} />
      {loading && (
        <View style={styles.loaderOverlay} pointerEvents="box-only">
          <RyxLoader fullScreen />
        </View>
      )}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable style={styles.backRow} onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={22} color={colors.primary.main} />
            <Text style={styles.backLabel}>{t('auth.registerOtpBack')}</Text>
          </Pressable>
          <Animated.View
            style={[
              styles.card,
              { opacity: contentOpacity, transform: [{ scale: contentScale }] },
            ]}
          >
            <View style={styles.logoBox}>
              <Image
                source={require('../../assets/images/logo_ryx.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>{t('auth.registerOtpScreenTitle')}</Text>
            <Text style={styles.subtitle}>{t('auth.registerOtpScreenSubtitle')}</Text>

            <Text style={styles.label}>{t('auth.registerOtpLabel')}</Text>
            <TextInput
              style={styles.input}
              placeholder="000000"
              placeholderTextColor={ui.textTertiary}
              value={otpCode}
              onChangeText={(x) => setOtpCode(x.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />

            {devOtpFromParams ? (
              <Text style={styles.devOtpText}>{t('auth.registerDevOtpHint', { code: devOtpFromParams })}</Text>
            ) : null}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && otpReady && !loading && styles.primaryButtonPressed,
                !otpReady && !loading && styles.primaryButtonDisabled,
                loading && { opacity: 0.88 },
              ]}
              onPress={handleSubmit}
              disabled={loading || !otpReady}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text
                  style={[
                    styles.primaryButtonText,
                    !otpReady && styles.primaryButtonTextDisabled,
                  ]}
                >
                  {t('auth.registerOtpCreateAccount')}
                </Text>
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.secondaryButton, pressed && { opacity: 0.88 }]}
              onPress={handleResend}
              disabled={resending}
            >
              {resending ? (
                <ActivityIndicator color={colors.primary.main} size="small" />
              ) : (
                <Text style={styles.secondaryButtonText}>{t('auth.registerOtpResend')}</Text>
              )}
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
