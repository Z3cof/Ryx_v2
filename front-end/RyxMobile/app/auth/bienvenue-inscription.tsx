import { useEffect, useRef, useMemo, useState } from 'react';
import { View, Text, Image, Animated, Easing, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar, type StatusBarStyle } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { login as apiLogin } from '../../services/auth';
import { consumePostRegisterCredentials } from '../../services/postRegisterSession';

const MIN_DISPLAY_MS = 2800;

function makeWelcomeStyles(
  ui: ReturnType<typeof import('../../theme').getUi>,
  primary: (typeof import('../../theme').colors)['primary'],
  spacing: typeof import('../../theme').spacing,
  fontSize: typeof import('../../theme').fontSize
) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: ui.background },
    gradient: { ...StyleSheet.absoluteFillObject },
    content: {
      flex: 1,
      paddingHorizontal: spacing[6],
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoWrap: {
      marginBottom: spacing[8],
    },
    logo: {
      width: 96,
      height: 96,
    },
    title: {
      fontSize: fontSize['2xl'],
      fontWeight: '800',
      color: ui.textTitle,
      textAlign: 'center',
      letterSpacing: -0.5,
      marginBottom: spacing[3],
    },
    tagline: {
      fontSize: fontSize.base,
      color: ui.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      maxWidth: 320,
    },
    footer: {
      position: 'absolute',
      bottom: spacing[10],
      left: 0,
      right: 0,
      alignItems: 'center',
    },
    loadingHint: {
      marginTop: spacing[2],
      fontSize: fontSize.sm,
      color: ui.textTertiary,
    },
  });
}

export default function BienvenueInscriptionScreen() {
  const params = useLocalSearchParams<{ userId?: string }>();
  const userId = params.userId || '';
  const insets = useSafeAreaInsets();
  const { ui, primary, spacing, fontSize } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(
    () => makeWelcomeStyles(ui, primary, spacing, fontSize),
    [ui, primary, spacing, fontSize]
  );

  const [signingIn, setSigningIn] = useState(false);
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.88)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslate = useRef(new Animated.Value(18)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!userId) {
      router.replace('/auth/register');
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const runAnimation = () =>
      new Promise<void>((resolve) => {
        Animated.stagger(
          100,
          [
            Animated.parallel([
              Animated.timing(logoOpacity, {
                toValue: 1,
                duration: 500,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }),
              Animated.spring(logoScale, {
                toValue: 1,
                friction: 7,
                tension: 80,
                useNativeDriver: true,
              }),
            ]),
            Animated.parallel([
              Animated.timing(titleOpacity, {
                toValue: 1,
                duration: 480,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }),
              Animated.timing(titleTranslate, {
                toValue: 0,
                duration: 480,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }),
            ]),
            Animated.timing(taglineOpacity, {
              toValue: 1,
              duration: 520,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ] as Animated.CompositeAnimation[]
        ).start(() => resolve());
      });

    const minDelay = new Promise<void>((r) => setTimeout(r, MIN_DISPLAY_MS));

    (async () => {
      await Promise.all([runAnimation(), minDelay]);
      if (cancelled) return;
      setSigningIn(true);
      const creds = await consumePostRegisterCredentials();
      if (!creds) {
        router.replace('/auth/login');
        return;
      }
      try {
        const res = await apiLogin(creds.email, creds.password);
        if (cancelled) return;
        router.replace({
          pathname: '/screen/accueil',
          params: { userId: res.user._id, userName: res.user.name || '' },
        });
      } catch {
        if (!cancelled) router.replace('/auth/login');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!userId) return null;

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style={ui.statusBar as StatusBarStyle} />
      <LinearGradient
        colors={ui.gradientSoft as [string, string, string, string]}
        style={styles.gradient}
        locations={[0, 0.25, 0.55, 1]}
      />
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.logoWrap,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Image source={require('../../assets/images/logo_ryx.png')} style={styles.logo} resizeMode="contain" />
        </Animated.View>
        <Animated.View style={{ opacity: titleOpacity, transform: [{ translateY: titleTranslate }] }}>
          <Text style={styles.title}>{t('auth.welcomeTitle')}</Text>
        </Animated.View>
        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>{t('auth.welcomeTagline')}</Animated.Text>
      </View>
      {signingIn ? (
        <View style={styles.footer}>
          <ActivityIndicator size="small" color={primary.main} />
          <Text style={styles.loadingHint}>{t('auth.welcomeLoading')}</Text>
        </View>
      ) : null}
    </View>
  );
}
