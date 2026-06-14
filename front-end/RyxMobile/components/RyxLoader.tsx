import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';

type RyxLoaderProps = {
  /** Plein écran (accueil) ou compact (bouton) */
  fullScreen?: boolean;
};

function AnimatedDot({ delay, dotColor }: { delay: number; dotColor: string }) {
  const translateY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -6,
          duration: 300,
          delay,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [delay, translateY]);
  return (
    <Animated.View style={[styles.dotBase, { backgroundColor: dotColor, transform: [{ translateY }] }]} />
  );
}

export function RyxLoader({ fullScreen = true }: RyxLoaderProps) {
  const { ui, colors, spacing } = useAppTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;
  const scale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  useEffect(() => {
    Animated.timing(scale, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [scale]);

  const dotColor = colors.primary.main;

  const content = (
    <>
      <Animated.Text
        style={[styles.logoText, { color: colors.primary.main, opacity, transform: [{ scale }] }]}
      >
        Ryx
      </Animated.Text>
      <View style={styles.dots}>
        <AnimatedDot delay={0} dotColor={dotColor} />
        <AnimatedDot delay={100} dotColor={dotColor} />
        <AnimatedDot delay={200} dotColor={dotColor} />
      </View>
    </>
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
  logoText: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 2,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 16,
  },
  dotBase: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.6,
  },
});

export default RyxLoader;
