import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { StatusBar, type StatusBarStyle } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAppTheme } from '../hooks/useAppTheme';
import { fetchSessionUser } from '../services/auth';
import { clearAuthToken, getPersistedAuthToken, getCachedUser, setCachedUser, clearCachedUser } from '../services/authSession';

const { width } = Dimensions.get('window');

function makeLandingStyles(
  ui: ReturnType<typeof import('../theme').getUi>,
  colors: typeof import('../theme').colors,
  spacing: typeof import('../theme').spacing,
  radius: typeof import('../theme').radius,
  fontSize: typeof import('../theme').fontSize,
  isDark: boolean
) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: ui.background,
    },
    decoCircle1: {
      position: 'absolute',
      width: width * 0.6,
      height: width * 0.6,
      borderRadius: width * 0.3,
      backgroundColor: isDark ? colors.primary.main : colors.primary.bg,
      opacity: isDark ? 0.14 : 0.6,
      top: -width * 0.2,
      right: -width * 0.2,
    },
    decoCircle2: {
      position: 'absolute',
      width: width * 0.4,
      height: width * 0.4,
      borderRadius: width * 0.2,
      backgroundColor: isDark ? colors.primary.main : colors.blue[100],
      opacity: isDark ? 0.1 : 0.4,
      bottom: '25%',
      left: -width * 0.15,
    },
    decoCircle3: {
      position: 'absolute',
      width: width * 0.25,
      height: width * 0.25,
      borderRadius: width * 0.125,
      backgroundColor: colors.primary.main,
      opacity: isDark ? 0.12 : 0.08,
      bottom: '15%',
      right: spacing[6],
    },
    contentWrap: {
      flex: 1,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing[8],
    },
    line: {
      height: 4,
      backgroundColor: colors.primary.main,
      borderRadius: 2,
      marginBottom: spacing[6],
    },
    logoContainer: {
      width: 88,
      height: 88,
      borderRadius: radius.xl,
      backgroundColor: ui.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing[5],
      shadowColor: colors.primary.main,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
      elevation: 6,
      borderWidth: 1,
      borderColor: ui.border,
    },
    logoImage: {
      width: 56,
      height: 56,
    },
    titleBlock: {
      alignItems: 'center',
      marginBottom: spacing[4],
    },
    welcome: {
      color: ui.textSecondary,
      fontSize: 20,
      fontWeight: '500',
      letterSpacing: 1,
    },
    welcomeBrand: {
      color: colors.primary.main,
      fontSize: 44,
      fontWeight: '800',
      letterSpacing: 2,
      marginTop: spacing[2],
    },
    tagline: {
      color: ui.textSecondary,
      fontSize: fontSize.base,
      textAlign: 'center',
      lineHeight: 24,
      paddingHorizontal: spacing[6],
    },
    taglineAccent: {
      color: ui.textTertiary,
      fontWeight: '500',
    },
    footer: {
      paddingHorizontal: spacing[6],
      paddingBottom: spacing[10] + 24,
      paddingTop: spacing[4],
    },
    buttonWrap: {
      width: '100%',
    },
    buttonWrapPressed: {
      opacity: 0.96,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing[2],
      backgroundColor: colors.primary.main,
      paddingVertical: spacing[5],
      paddingHorizontal: spacing[8],
      borderRadius: radius.xl,
      shadowColor: colors.primary.main,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 6,
    },
    buttonText: {
      color: colors.white,
      fontSize: fontSize.lg,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    buttonArrow: {
      color: colors.white,
      fontSize: 22,
      fontWeight: '700',
    },
    ctaSubtext: {
      color: ui.textTertiary,
      fontSize: fontSize.xs,
      textAlign: 'center',
      marginTop: spacing[3],
    },
  });
}

export default function LandingScreen() {
  const { ui, colors, primary, spacing, radius, fontSize, isDark } = useAppTheme();
  const styles = useMemo(
    () => makeLandingStyles(ui, colors, spacing, radius, fontSize, isDark),
    [ui, colors, spacing, radius, fontSize, isDark]
  );

  const [sessionBooting, setSessionBooting] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getPersistedAuthToken();
        if (!token) {
          setSessionBooting(false);
          return;
        }

        const cachedUser = await getCachedUser();

        try {
          const { user } = await fetchSessionUser();
          await setCachedUser(user);
          if (cancelled) return;
          router.replace({
            pathname: '/screen/accueil',
            params: { userId: user._id, userName: user.name || '' },
          });
        } catch (fetchErr) {
          const errMsg = fetchErr instanceof Error ? fetchErr.message : '';
          const isNetworkError =
            errMsg.includes('réseau') ||
            errMsg.includes('serveur injoignable') ||
            errMsg.includes('Délai dépassé') ||
            errMsg.includes('Network') ||
            errMsg.includes('timeout') ||
            errMsg.includes('fetch');

          if (isNetworkError) {
            if (cancelled) return;
            const uId = cachedUser?._id || '';
            const uName = cachedUser?.name || '';
            console.log('[Offline Boot] network issue. Proceeding with active session token. Cache:', uId);
            router.replace({
              pathname: '/screen/accueil',
              params: { userId: uId, userName: uName },
            });
          } else {
            // genuine auth failure, clear session
            await clearAuthToken();
            await clearCachedUser();
            if (!cancelled) setSessionBooting(false);
          }
        }
      } catch (err) {
        await clearAuthToken();
        await clearCachedUser();
        if (!cancelled) setSessionBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const lineWidth = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.9)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(12)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonTranslateY = useRef(new Animated.Value(20)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentScale = useRef(new Animated.Value(1)).current;
  const [isTransitioning, setIsTransitioning] = useState(false);

  const gradientSoft = ui.gradientSoft as [string, string, string, string];

  const handleCommencer = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    Animated.parallel([
      Animated.timing(scale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 0,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(contentScale, {
          toValue: 0.96,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        router.push('/auth/login');
      });
    });
  }, [isTransitioning, scale, contentOpacity, contentScale]);

  useEffect(() => {
    if (sessionBooting) return;
    Animated.sequence([
      Animated.timing(lineWidth, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, damping: 14, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(titleY, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]),
      Animated.timing(taglineOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(buttonOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(buttonTranslateY, { toValue: 0, damping: 18, useNativeDriver: true }),
      ]),
    ]).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.02,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [sessionBooting]);

  const lineAnimStyle = {
    width: lineWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '50%'] }),
  };

  if (sessionBooting) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar style={ui.statusBar as StatusBarStyle} />
        <ActivityIndicator size="large" color={primary.main} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style={ui.statusBar as StatusBarStyle} />
      <LinearGradient colors={gradientSoft} locations={[0, 0.2, 0.5, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.decoCircle1} />
      <View style={styles.decoCircle2} />
      <View style={styles.decoCircle3} />

      <Animated.View
        style={[
          styles.contentWrap,
          {
            opacity: contentOpacity,
            transform: [{ scale: contentScale }],
          },
        ]}
        pointerEvents={isTransitioning ? 'none' : 'auto'}
      >
        <View style={styles.center}>
          <Animated.View style={[styles.line, lineAnimStyle]} />

          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <Image
              source={require('../assets/images/logo_ryx.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.titleBlock,
              {
                opacity: titleOpacity,
                transform: [{ translateY: titleY }],
              },
            ]}
          >
            <Text style={styles.welcome}>Bienvenue sur</Text>
            <Text style={styles.welcomeBrand}>Ryx</Text>
          </Animated.View>

          <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
            Gardez un œil sur votre vie financière.{'\n'}
            <Text style={styles.taglineAccent}>Simple, clair, sous votre contrôle.</Text>
          </Animated.Text>
        </View>

        <Animated.View
          style={[
            styles.footer,
            {
              opacity: buttonOpacity,
              transform: [{ translateY: buttonTranslateY }],
            },
          ]}
        >
          <Pressable
            style={({ pressed }) => [styles.buttonWrap, pressed && styles.buttonWrapPressed]}
            onPress={handleCommencer}
            onPressIn={() => {
              if (!isTransitioning) {
                Animated.spring(scale, { toValue: 0.97, damping: 15, useNativeDriver: true }).start();
              }
            }}
            onPressOut={() => {
              if (!isTransitioning) {
                Animated.spring(scale, { toValue: 1, damping: 15, useNativeDriver: true }).start();
              }
            }}
          >
            <Animated.View style={[styles.button, { transform: [{ scale: Animated.multiply(scale, pulseScale) }] }]}>
              <Text style={styles.buttonText}>Commencer</Text>
              <Text style={styles.buttonArrow}>→</Text>
            </Animated.View>
          </Pressable>
          <Text style={styles.ctaSubtext}>Gratuit • Sans engagement</Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}
