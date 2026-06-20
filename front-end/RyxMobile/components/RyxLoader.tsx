import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useAppTheme } from '../hooks/useAppTheme';

type RyxLoaderProps = {
  /** Plein écran (accueil) ou compact (bouton) */
  fullScreen?: boolean;
};

export function RyxLoader({ fullScreen = true }: RyxLoaderProps) {
  const { ui, colors, spacing } = useAppTheme();
  
  const spinValue1 = useRef(new Animated.Value(0)).current;
  const spinValue2 = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(0.8)).current;
  const opacityValue = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // Clockwise spin for outer ring
    const spin1 = Animated.loop(
      Animated.timing(spinValue1, {
        toValue: 1,
        duration: 1500,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      })
    );
    // Counter-clockwise spin for inner ring
    const spin2 = Animated.loop(
      Animated.timing(spinValue2, {
        toValue: 1,
        duration: 1000,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      })
    );
    // Pulse for central orb
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseValue, {
            toValue: 1.2,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacityValue, {
            toValue: 1.0,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseValue, {
            toValue: 0.8,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacityValue, {
            toValue: 0.5,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    spin1.start();
    spin2.start();
    pulse.start();

    return () => {
      spin1.stop();
      spin2.stop();
      pulse.stop();
    };
  }, [spinValue1, spinValue2, pulseValue, opacityValue]);

  const rotate1 = spinValue1.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const rotate2 = spinValue2.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  const size = fullScreen ? 120 : 36;
  const strokeWidthOuter = fullScreen ? 4 : 3;
  const strokeWidthInner = fullScreen ? 3 : 2.5;

  const content = (
    <View style={styles.container}>
      {/* Outer Ring */}
      <Animated.View
        style={[
          styles.spinnerLayer,
          {
            width: size,
            height: size,
            transform: [{ rotate: rotate1 }],
          },
        ]}
      >
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="outerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={colors.primary.main} />
              <Stop offset="50%" stopColor="#f59e0b" />
              <Stop offset="100%" stopColor="transparent" />
            </LinearGradient>
          </Defs>
          <Circle
            cx="50"
            cy="50"
            r="42"
            stroke="url(#outerGrad)"
            strokeWidth={strokeWidthOuter * (100 / size)}
            fill="none"
            strokeLinecap="round"
            strokeDasharray="180 80"
          />
        </Svg>
      </Animated.View>

      {/* Inner Ring */}
      <Animated.View
        style={[
          styles.spinnerLayer,
          {
            width: size * 0.75,
            height: size * 0.75,
            transform: [{ rotate: rotate2 }],
          },
        ]}
      >
        <Svg width={size * 0.75} height={size * 0.75} viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="innerGrad" x1="100%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#7c3aed" />
              <Stop offset="50%" stopColor="#10b981" />
              <Stop offset="100%" stopColor="transparent" />
            </LinearGradient>
          </Defs>
          <Circle
            cx="50"
            cy="50"
            r="42"
            stroke="url(#innerGrad)"
            strokeWidth={strokeWidthInner * (100 / (size * 0.75))}
            fill="none"
            strokeLinecap="round"
            strokeDasharray="140 100"
          />
        </Svg>
      </Animated.View>

      {/* Pulsing Central Glow Orb */}
      <Animated.View
        style={[
          styles.centerOrb,
          {
            width: size * 0.28,
            height: size * 0.28,
            borderRadius: (size * 0.28) / 2,
            backgroundColor: colors.primary.main,
            opacity: opacityValue,
            transform: [{ scale: pulseValue }],
            shadowColor: colors.primary.main,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 10,
            elevation: 5,
          },
        ]}
      />
    </View>
  );

  if (fullScreen) {
    return (
      <View style={[styles.fullScreen, { backgroundColor: ui.background }]}>
        {content}
      </View>
    );
  }

  return (
    <View style={[styles.inline, { paddingVertical: spacing[2] }]}>{content}</View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inline: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  spinnerLayer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerOrb: {
    position: 'absolute',
  },
});

export default RyxLoader;
