import { useState, useRef, useEffect, useMemo } from 'react';
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
  Alert,
} from 'react-native';
import * as Localization from 'expo-localization';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { StatusBar, type StatusBarStyle } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import {
  parsePhoneNumberFromString,
  getCountryCallingCode,
  getCountries,
  type CountryCode,
} from 'libphonenumber-js';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from '../../hooks/useTranslation';
import {
  checkHealth,
  getApiBaseUrl,
  register as apiRegister,
  sendWhatsappOtp,
  verifyWhatsappOtp,
} from '../../services/auth';
import { clearRegisterDraft, getRegisterDraft, setRegisterDraft } from '../../services/registerDraft';
import { setPostRegisterCredentials } from '../../services/postRegisterSession';
import { RyxLoader } from '../../components/RyxLoader';
import { CountryDialPickerModal } from '../../components/CountryDialPickerModal';
import {
  getCountryHintForPhoneDisplay,
  getDetectedCountryFromPhone,
} from '../../utils/phoneCountryDetection';
import { getCurrencyForCountry } from '../../utils/countryCurrency';
import { RegisterFormStep } from '../../components/auth/register/RegisterFormStep';
import { RegisterOtpStep } from '../../components/auth/register/RegisterOtpStep';

function defaultCountryIso(): CountryCode {
  return 'ML';
}

type PasswordStrengthTier = 'none' | 'weak' | 'medium' | 'strong';

function computePasswordStrength(password: string): PasswordStrengthTier {
  if (!password) return 'none';
  let points = 0;
  if (password.length >= 6) points += 1;
  if (password.length >= 10) points += 1;
  if (/[a-z]/.test(password)) points += 1;
  if (/[A-Z]/.test(password)) points += 1;
  if (/\d/.test(password)) points += 1;
  if (/[^A-Za-z0-9]/.test(password)) points += 1;
  if (points <= 2) return 'weak';
  if (points <= 4) return 'medium';
  return 'strong';
}

function makeRegisterStyles(
  ui: ReturnType<typeof import('../../theme').getUi>,
  colors: typeof import('../../theme').colors,
  primary: ReturnType<typeof useAppTheme>['primary'],
  spacing: typeof import('../../theme').spacing,
  radius: typeof import('../../theme').radius,
  fontSize: typeof import('../../theme').fontSize,
  isDark: boolean
) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: ui.background,
    },
    flex: { flex: 1 },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: spacing[6],
      paddingTop: spacing[8],
      paddingBottom: spacing[12],
    },
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
    logoImage: {
      width: 36,
      height: 36,
    },
    title: {
      color: primary.link,
      fontSize: 22,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: spacing[1],
    },
    subtitle: {
      color: ui.textSecondary,
      fontSize: fontSize.sm,
      textAlign: 'center',
      marginBottom: spacing[6],
    },
    form: { gap: 0 },
    label: {
      color: ui.textTitle,
      fontSize: fontSize.sm,
      fontWeight: '500',
      marginTop: spacing[4],
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
    primaryButton: {
      backgroundColor: colors.primary.main,
      paddingVertical: spacing[4],
      borderRadius: radius.lg,
      marginTop: spacing[5],
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonLoadingInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonPressed: { opacity: 0.9 },
    primaryButtonDisabled: {
      backgroundColor: isDark ? '#475569' : '#cbd5e1',
      opacity: 1,
    },
    primaryButtonTextDisabled: {
      color: isDark ? '#94a3b8' : '#64748b',
    },
    errorText: {
      color: '#dc2626',
      fontSize: fontSize.sm,
      marginTop: spacing[2],
      textAlign: 'center',
    },
    primaryButtonText: {
      color: colors.white,
      fontSize: fontSize.base,
      fontWeight: '600',
      textAlign: 'center',
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: spacing[5],
      gap: spacing[3],
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: ui.border,
    },
    dividerText: {
      color: ui.textTertiary,
      fontSize: fontSize.xs,
    },
    socialRow: { flexDirection: 'row', gap: spacing[3] },
    socialButton: {
      flex: 1,
      paddingVertical: spacing[3] + 2,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: ui.border,
      backgroundColor: ui.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    socialButtonPressed: { opacity: 0.85 },
    socialButtonText: {
      color: ui.textSecondary,
      fontSize: fontSize.sm,
      fontWeight: '500',
    },
    testLinkWrap: {
      marginTop: spacing[4],
      alignItems: 'center',
    },
    testLink: {
      color: ui.textSecondary,
      fontSize: fontSize.xs,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing[5],
      flexWrap: 'wrap',
    },
    footerText: {
      color: ui.textSecondary,
      fontSize: fontSize.sm,
    },
    footerLink: {
      color: colors.primary.main,
      fontSize: fontSize.sm,
      fontWeight: '600',
    },
    phoneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: 0 },
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
    nationalInput: { flex: 1, minWidth: 0 },
    phoneDetectionHint: {
      marginTop: spacing[2],
      fontSize: fontSize.sm,
      color: ui.textPrimary,
      fontWeight: '500',
    },
    pwdMeterWrap: { marginTop: spacing[2] },
    pwdMeterRow: { flexDirection: 'row', gap: spacing[1] + 2 },
    pwdMeterSeg: { flex: 1, height: 5, borderRadius: 3, overflow: 'hidden' },
    pwdMeterSegMuted: {
      backgroundColor: isDark ? '#334155' : '#e2e8f0',
    },
    pwdMeterLabel: {
      marginTop: spacing[1],
      fontSize: fontSize.xs,
      fontWeight: '600',
    },
    loaderOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: ui.background,
      zIndex: 100,
      justifyContent: 'center',
      alignItems: 'center',
    },
    backEditRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing[4],
      alignSelf: 'flex-start',
    },
    backEditLabel: {
      color: colors.primary.main,
      fontSize: fontSize.sm,
      fontWeight: '600',
      marginLeft: spacing[1],
    },
    otpTitle: {
      color: colors.primary.main,
      fontSize: 22,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: spacing[2],
    },
    otpSubtitle: {
      color: ui.textSecondary,
      fontSize: fontSize.sm,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: spacing[6],
    },
    otpInput: {
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
    secondaryOutlineBtn: {
      marginTop: spacing[3],
      paddingVertical: spacing[3],
      borderRadius: radius.md,
      borderWidth: 2,
      borderColor: colors.primary.main,
      alignItems: 'center',
    },
    secondaryOutlineBtnText: {
      color: colors.primary.main,
      fontWeight: '600',
      fontSize: fontSize.sm,
    },
    devOtpHint: {
      marginTop: spacing[2],
      fontSize: fontSize.xs,
      color: ui.textSecondary,
      textAlign: 'center',
    },
  });
}

export default function RegisterScreen() {
  const { ui, colors, primary, spacing, radius, fontSize, isDark } = useAppTheme();
  const { t, locale } = useTranslation();
  const styles = useMemo(
    () => makeRegisterStyles(ui, colors, primary, spacing, radius, fontSize, isDark),
    [ui, colors, primary, spacing, radius, fontSize, isDark]
  );
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [countryIso, setCountryIso] = useState<CountryCode>(defaultCountryIso);
  const [nationalPhone, setNationalPhone] = useState('');
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registerPhase, setRegisterPhase] = useState<'form' | 'otp'>('form');
  const [otpCode, setOtpCode] = useState('');
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [resending, setResending] = useState(false);
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentScale = useRef(new Animated.Value(0.96)).current;
  const contentTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const detected = getDetectedCountryFromPhone(nationalPhone, countryIso);
    if (detected) {
      setCountryIso((prev) => (prev === detected ? prev : detected));
    }
  }, [nationalPhone, countryIso]);

  // Relance l'animation d'entrée à chaque fois que l'écran reprend le focus
  // (évite l'écran blanc lors du retour arrière)
  useFocusEffect(
    useCallback(() => {
      setIsTransitioning(false);
      contentOpacity.setValue(0);
      contentScale.setValue(0.96);
      contentTranslateY.setValue(20);
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
        Animated.timing(contentTranslateY, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, [])
  );

  const localeTag = locale === 'en' ? 'en' : 'fr-FR';

  const phoneE164 = useMemo(() => {
    const raw = nationalPhone.replace(/\s/g, '');
    if (!raw) return null;
    const p = raw.startsWith('+')
      ? parsePhoneNumberFromString(raw)
      : parsePhoneNumberFromString(raw, countryIso);
    if (!p?.isValid()) return null;
    return p.format('E.164');
  }, [nationalPhone, countryIso]);

  const phoneDetectionLine = useMemo(() => {
    const iso = getCountryHintForPhoneDisplay(nationalPhone, countryIso);
    if (!iso) return null;
    try {
      const region =
        new Intl.DisplayNames([localeTag], { type: 'region' }).of(iso) ?? iso;
      const cur = getCurrencyForCountry(iso);
      let curPart = cur;
      try {
        const curLabel = new Intl.DisplayNames([localeTag], {
          type: 'currency',
        }).of(cur);
        if (curLabel && curLabel !== cur) curPart = `${cur} (${curLabel})`;
      } catch {
        /* Hermes sans données devise : garder le code ISO */
      }
      return t('auth.registerPhoneDetectedLine', {
        country: region,
        currency: curPart,
      });
    } catch {
      return null;
    }
  }, [nationalPhone, countryIso, localeTag, t]);

  const passwordStrength = useMemo(() => computePasswordStrength(password), [password]);

  const canContinue = useMemo(() => {
    if (!name.trim() || !email.trim() || !nationalPhone.trim()) return false;
    if (!phoneE164) return false;
    if (password.length < 6) return false;
    if (!confirmPassword) return false;
    if (password !== confirmPassword) return false;
    return true;
  }, [name, email, nationalPhone, phoneE164, password, confirmPassword]);

  const otpReady = otpCode.replace(/\s/g, '').length === 6;

  const navigateWithExit = (path: string) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentScale, {
        toValue: 0.96,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => router.push(path as '/auth/login'));
  };

  const mapPrecheckError = (err: Error & { status?: number; code?: string }) => {
    if (err.code === 'EMAIL_TAKEN') return t('auth.registerEmailTaken');
    if (err.code === 'PHONE_TAKEN') return t('auth.registerPhoneTaken');
    if (err.code === 'EMAIL_INVALID') return t('auth.registerEmailInvalid');
    if (err.code === 'PHONE_INVALID') return t('auth.registerErrPhoneInvalid');
    return err instanceof Error ? err.message : 'Erreur';
  };

  const handleContinueToOtp = async () => {
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Tous les champs sont requis.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères.');
      return;
    }
    if (!phoneE164) {
      setError(t('auth.registerErrPhoneInvalid'));
      return;
    }
    const draftCountryIso =
      getDetectedCountryFromPhone(nationalPhone, countryIso) ?? countryIso;
    setError(null);
    setSendingCode(true);
    try {
      const emailNorm = email.trim().toLowerCase();
      const res = await sendWhatsappOtp(phoneE164, { email: emailNorm });
      setRegisterDraft({
        name: name.trim(),
        email: emailNorm,
        password,
        phoneE164,
        countryIso: draftCountryIso,
      });
      setDevOtpHint(res.devOtp ?? null);
      setOtpCode('');
      setRegisterPhase('otp');
    } catch (e) {
      const err = e as Error & { status?: number; code?: string };
      if (
        err.code === 'EMAIL_TAKEN' ||
        err.code === 'PHONE_TAKEN' ||
        err.code === 'EMAIL_INVALID' ||
        err.code === 'PHONE_INVALID'
      ) {
        setError(mapPrecheckError(err));
      } else {
        setError(err instanceof Error ? err.message : 'Erreur envoi code');
      }
    } finally {
      setSendingCode(false);
    }
  };

  const handleBackToForm = () => {
    setRegisterPhase('form');
    setOtpCode('');
    setDevOtpHint(null);
    setError(null);
    clearRegisterDraft();
  };

  const handleResendOtp = async () => {
    const draftPhone = getRegisterDraft()?.phoneE164 ?? phoneE164;
    if (!draftPhone) return;
    setError(null);
    setResending(true);
    try {
      const d = getRegisterDraft();
      const res = await sendWhatsappOtp(draftPhone, d?.email ? { email: d.email } : undefined);
      setDevOtpHint(res.devOtp ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur envoi code');
    } finally {
      setResending(false);
    }
  };

  const handleCreateAccountWithOtp = async () => {
    const d = getRegisterDraft();
    if (!d?.phoneE164) {
      setError(t('auth.registerErrPhoneInvalid'));
      return;
    }
    const code = otpCode.replace(/\s/g, '');
    if (code.length !== 6) {
      setError(t('auth.registerOtpIncomplete'));
      return;
    }
    setError(null);
    setRegistering(true);
    try {
      const { verificationToken } = await verifyWhatsappOtp(d.phoneE164, code);
      const res = await apiRegister(
        d.name,
        d.email,
        d.password,
        d.phoneE164,
        verificationToken,
        d.countryIso
      );
      clearRegisterDraft();
      await setPostRegisterCredentials(d.phoneE164, d.password);
      router.replace({
        pathname: '/auth/est-vendeur',
        params: { userId: res.user._id, userName: res.user.name || d.name },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setRegistering(false);
    }
  };

  const handleTestConnection = async () => {
    const url = getApiBaseUrl();
    const ok = await checkHealth();
    Alert.alert(
      ok ? 'Connexion OK' : 'Serveur inaccessible',
      ok
        ? `Le back-end répond. URL : ${url}`
        : `Impossible de joindre le back-end. Vérifiez : 1) Back démarré (npm start) 2) Si téléphone réel, mettez l'IP du PC dans config/api.ts. URL : ${url}`,
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar style={ui.statusBar as StatusBarStyle} />
      {registering ? (
        <View style={styles.loaderOverlay} pointerEvents="box-only">
          <RyxLoader fullScreen />
        </View>
      ) : null}
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
          <Animated.View
            style={[
              styles.card,
              {
                opacity: contentOpacity,
                transform: [
                  { scale: contentScale },
                  { translateY: contentTranslateY },
                ],
              },
            ]}
            pointerEvents={isTransitioning ? 'none' : 'auto'}
          >
            <View style={styles.logoBox}>
              <Image
                source={require('../../assets/images/logo_ryx.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            {registerPhase === 'form' ? (
              <RegisterFormStep
                name={name}
                setName={setName}
                email={email}
                setEmail={setEmail}
                countryIso={countryIso}
                setCountryModalVisible={setCountryModalVisible}
                nationalPhone={nationalPhone}
                setNationalPhone={setNationalPhone}
                phoneDetectionLine={phoneDetectionLine}
                password={password}
                setPassword={setPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                passwordStrength={passwordStrength}
                error={error}
                sendingCode={sendingCode}
                canContinue={canContinue}
                handleContinueToOtp={handleContinueToOtp}
                handleTestConnection={handleTestConnection}
                navigateWithExit={navigateWithExit}
                styles={styles}
              />
            ) : (
              <RegisterOtpStep
                handleBackToForm={handleBackToForm}
                registering={registering}
                resending={resending}
                otpCode={otpCode}
                setOtpCode={setOtpCode}
                devOtpHint={devOtpHint}
                error={error}
                otpReady={otpReady}
                handleCreateAccountWithOtp={handleCreateAccountWithOtp}
                handleResendOtp={handleResendOtp}
                navigateWithExit={navigateWithExit}
                styles={styles}
              />
            )}
          </Animated.View>
        </ScrollView>
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
    </View>
  );
}

