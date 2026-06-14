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
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Localization from 'expo-localization';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { StatusBar, type StatusBarStyle } from 'expo-status-bar';
import {
  parsePhoneNumberFromString,
  getCountries,
  getCountryCallingCode,
  type CountryCode,
} from 'libphonenumber-js';
import { useAppTheme } from '../../hooks/useAppTheme';
import { RyxLoader } from '../../components/RyxLoader';
import { login as apiLogin } from '../../services/auth';
import { clearPostRegisterCredentials } from '../../services/postRegisterSession';
import { CountryDialPickerModal } from '../../components/CountryDialPickerModal';

function defaultCountryIso(): CountryCode {
  const r = Localization.getLocales()[0]?.regionCode;
  if (r && getCountries().includes(r as CountryCode)) return r as CountryCode;
  return 'ML';
}

function makeLoginStyles(
  ui: ReturnType<typeof import('../../theme').getUi>,
  colors: typeof import('../../theme').colors,
  primary: ReturnType<typeof useAppTheme>['primary'],
  spacing: typeof import('../../theme').spacing,
  radius: typeof import('../../theme').radius,
  fontSize: typeof import('../../theme').fontSize
) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: ui.background,
    },
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
      paddingTop: spacing[12],
      paddingBottom: spacing[12],
      justifyContent: 'center',
      minHeight: '100%',
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
    form: {
      gap: 0,
    },
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
    forgotWrap: {
      alignSelf: 'flex-end',
      marginTop: spacing[2],
    },
    forgotLink: {
      color: ui.textSecondary,
      fontSize: fontSize.xs,
    },
    primaryButton: {
      backgroundColor: colors.primary.main,
      paddingVertical: spacing[4],
      borderRadius: radius.lg,
      marginTop: spacing[5],
    },
    primaryButtonPressed: { opacity: 0.9 },
    primaryButtonDisabled: { opacity: 0.7 },
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
      color: primary.link,
      fontSize: fontSize.sm,
      fontWeight: '600',
    },
  });
}

export default function LoginScreen() {
  const { ui, colors, primary, spacing, radius, fontSize } = useAppTheme();
  const styles = useMemo(
    () => makeLoginStyles(ui, colors, primary, spacing, radius, fontSize),
    [ui, colors, primary, spacing, radius, fontSize]
  );

  const [countryIso, setCountryIso] = useState<CountryCode>(defaultCountryIso);
  const [nationalPhone, setNationalPhone] = useState('');
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentScale = useRef(new Animated.Value(0.96)).current;
  const contentTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    clearPostRegisterCredentials();
  }, []);

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

  /** Convertit le numéro national saisi en E.164, ou null si invalide. */
  const phoneE164 = useMemo(() => {
    const raw = nationalPhone.replace(/\s/g, '');
    if (!raw) return null;
    const p = raw.startsWith('+')
      ? parsePhoneNumberFromString(raw)
      : parsePhoneNumberFromString(raw, countryIso);
    if (!p?.isValid()) return null;
    return p.format('E.164');
  }, [nationalPhone, countryIso]);

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
    ]).start(() => router.push(path as '/auth/register'));
  };

  const handleLogin = async () => {
    if (!nationalPhone.trim()) {
      setError('Renseignez votre numéro de téléphone.');
      return;
    }
    if (!phoneE164) {
      setError('Numéro de téléphone invalide.');
      return;
    }
    if (!password) {
      setError('Renseignez votre mot de passe.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await apiLogin(phoneE164, password);
      router.replace({ pathname: '/screen/accueil', params: { userName: res.user.name, userId: res.user._id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de connexion');
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
            <Text style={styles.title}>Bon retour</Text>
            <Text style={styles.subtitle}>
              Connectez-vous pour continuer.
            </Text>

            <View style={styles.form}>
              <Text style={styles.label}>Numéro de téléphone</Text>
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
                  placeholder="6 00 00 00 00"
                  placeholderTextColor={ui.textTertiary}
                  value={nationalPhone}
                  onChangeText={setNationalPhone}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <Text style={styles.label}>Mot de passe</Text>
              <View style={styles.passwordWrap}>
                <TextInput
                  style={[styles.input, styles.inputPassword]}
                  placeholder="••••••••"
                  placeholderTextColor={ui.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <Pressable
                  style={styles.eyeButton}
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={8}
                >
                  <Text style={styles.eyeButtonText}>
                    {showPassword ? 'Masquer' : 'Afficher'}
                  </Text>
                </Pressable>
              </View>
              <Pressable
                style={styles.forgotWrap}
                hitSlop={8}
                onPress={() => navigateWithExit('/auth/forgot-password')}
              >
                <Text style={styles.forgotLink}>Mot de passe oublié ?</Text>
              </Pressable>

              {error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : null}

              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.primaryButtonPressed,
                  loading && styles.primaryButtonDisabled,
                ]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Connexion</Text>
                )}
              </Pressable>
            </View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.socialButton,
                  pressed && styles.socialButtonPressed,
                ]}
                onPress={() => {}}
              >
                <Text style={styles.socialButtonText}>Google</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.socialButton,
                  pressed && styles.socialButtonPressed,
                ]}
                onPress={() => {}}
              >
                <Text style={styles.socialButtonText}>Facebook</Text>
              </Pressable>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Pas encore de compte ? </Text>
              <Pressable hitSlop={8} onPress={() => navigateWithExit('/auth/register')}>
                <Text style={styles.footerLink}>S&apos;inscrire</Text>
              </Pressable>
            </View>
          </Animated.View>
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
