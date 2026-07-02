import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  Animated,
  Easing,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { StatusBar, type StatusBarStyle } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../hooks/useAppTheme';

function makeEstVendeurStyles(
  ui: ReturnType<typeof import('../../theme').getUi>,
  colors: typeof import('../../theme').colors,
  spacing: typeof import('../../theme').spacing,
  radius: typeof import('../../theme').radius,
  fontSize: typeof import('../../theme').fontSize
) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: ui.background,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing[6],
    },
    content: { alignItems: 'center', width: '100%', maxWidth: 340 },
    logoWrap: { marginBottom: spacing[8] },
    logo: { width: 80, height: 80 },
    title: {
      fontSize: fontSize['2xl'],
      fontWeight: '800',
      color: ui.textTitle,
      textAlign: 'center',
      marginBottom: spacing[4],
    },
    subtitle: {
      fontSize: fontSize.base,
      color: ui.textSecondary,
      textAlign: 'center',
      marginBottom: spacing[8],
      lineHeight: 22,
    },
    buttons: { width: '100%' },
    btn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing[2],
      paddingVertical: spacing[4],
      paddingHorizontal: spacing[6],
      borderRadius: radius.lg,
      backgroundColor: '#d97706',
    },
    btnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.base },
    btnPressed: { opacity: 0.9 },
  });
}

export default function EstVendeurScreen() {
  const { ui, colors, spacing, radius, fontSize } = useAppTheme();
  const styles = useMemo(
    () => makeEstVendeurStyles(ui, colors, spacing, radius, fontSize),
    [ui, colors, spacing, radius, fontSize]
  );
  const params = useLocalSearchParams<{ userId?: string; userName?: string }>();
  const userId = params.userId || '';
  const userName = params.userName || '';

  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentScale = useRef(new Animated.Value(0.96)).current;

  useFocusEffect(
    useCallback(() => {
      if (!userId) {
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
    }, [userId])
  );

  const handleContinue = () => {
    router.replace({
      pathname: '/auth/onboarding-recurring-income',
      params: { userId, userName },
    });
  };

  if (!userId) return null;

  return (
    <View style={styles.root}>
      <StatusBar style={ui.statusBar as StatusBarStyle} />
      <Animated.View
        style={[
          styles.content,
          {
            opacity: contentOpacity,
            transform: [{ scale: contentScale }],
          },
        ]}
      >
        <View style={styles.logoWrap}>
          <Image source={require('../../assets/images/logo_ryx.png')} style={styles.logo} resizeMode="contain" />
        </View>
        <Text style={styles.title}>Bienvenue dans RyxQuest ! ⚡</Text>
        <Text style={styles.subtitle}>
          Ryx intègre RyxQuest, un système intelligent de défis financiers personnalisés pour vous aider à épargner et optimiser votre budget de façon ludique !
        </Text>
        <View style={styles.buttons}>
          <Pressable
            style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
            onPress={handleContinue}
          >
            <Ionicons name="flash" size={24} color={colors.white} />
            <Text style={styles.btnText}>C'est parti ! 🚀</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}
