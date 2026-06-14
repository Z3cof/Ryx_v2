import { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import theme from './theme';

const { colors, spacing, radius, fontSize } = theme;

export default function App() {
  const lineWidth = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(0.85)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonTranslateY = useRef(new Animated.Value(24)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Séquences d'entrée
    Animated.sequence([
      // 1. La barre décorative s'allonge
      Animated.timing(lineWidth, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      // 2. Titre : scale + fade
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(titleScale, {
          toValue: 1,
          damping: 14,
          useNativeDriver: true,
        }),
      ]),
      // 3. Tagline apparaît
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      // 4. Bouton monte depuis le bas
      Animated.parallel([
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(buttonTranslateY, {
          toValue: 0,
          damping: 16,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Pulse doux sur le bouton (boucle)
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.03,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const lineAnimStyle = {
    width: lineWidth.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '60%'],
    }),
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Contenu central */}
      <View style={styles.center}>
        {/* Barre décorative animée */}
        <Animated.View style={[styles.line, lineAnimStyle]} />

        {/* Titre avec animation */}
        <Animated.View
          style={{
            opacity: titleOpacity,
            transform: [{ scale: titleScale }],
          }}
        >
          <Text style={styles.welcome}>Bienvenue sur</Text>
          <Text style={styles.welcomeBrand}>Ryx</Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
          Gardez un oeil sur votre vie financière.
        </Animated.Text>
      </View>

      {/* Bouton "Commencez" en bas */}
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
          onPressIn={() => {
            Animated.spring(scale, {
              toValue: 0.98,
              damping: 15,
              useNativeDriver: true,
            }).start();
          }}
          onPressOut={() => {
            Animated.spring(scale, {
              toValue: 1,
              damping: 15,
              useNativeDriver: true,
            }).start();
          }}
        >
          <Animated.View style={[styles.button, { transform: [{ scale: Animated.multiply(scale, pulseScale) }] }]}>
            <Text style={styles.buttonText}>Commencez</Text>
            <Text style={styles.buttonArrow}>→</Text>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.green.dark,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[10],
  },
  line: {
    height: 3,
    backgroundColor: colors.green.lime,
    borderRadius: 2,
    marginBottom: spacing[8],
  },
  welcome: {
    color: colors.white,
    fontSize: 26,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
    opacity: 0.95,
  },
  welcomeBrand: {
    color: colors.green.lime,
    fontSize: 42,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 2,
    marginTop: spacing[1],
  },
  tagline: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing[6],
    paddingHorizontal: spacing[4],
    lineHeight: 22,
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
    opacity: 0.98,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.green.lime,
    paddingVertical: spacing[5],
    paddingHorizontal: spacing[8],
    borderRadius: radius.xl,
    borderWidth: 2,
    borderColor: 'rgba(163, 230, 53, 0.5)',
    shadowColor: colors.green.lime,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  buttonArrow: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '700',
  },
});
