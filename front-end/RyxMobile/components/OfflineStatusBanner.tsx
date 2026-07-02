import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../hooks/useAppTheme';
import { useOfflineSync } from '../hooks/useOfflineSync';

export function OfflineStatusBanner() {
  const { isConnected, isSyncing, syncSuccess } = useOfflineSync();
  const insets = useSafeAreaInsets();
  const { ui, colors, spacing, radius, fontSize } = useAppTheme();

  // Anim for banner slide-down
  const slideAnim = useRef(new Animated.Value(-100)).current;

  // Decide if we should show the banner and what content to render
  const shouldShow = !isConnected || isSyncing || syncSuccess;

  useEffect(() => {
    if (shouldShow) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -100 - insets.top,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [shouldShow, insets.top]);

  if (!shouldShow) return null;

  let bg = '#f59e0b'; // Amber for offline
  let textColor = '#ffffff';
  let iconName: any = 'cloud-offline';
  let label = 'Mode hors ligne';
  let showSpinner = false;

  if (isSyncing) {
    bg = '#10b981'; // Green for syncing
    iconName = 'sync-outline';
    label = 'Connexion rétablie. Synchronisation...';
    showSpinner = true;
  } else if (syncSuccess) {
    bg = '#10b981'; // Green for success
    iconName = 'checkmark-circle-outline';
    label = 'Données synchronisées avec succès !';
  }

  const paddingTop = Platform.OS === 'ios' ? Math.max(12, insets.top) : insets.top + 6;

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          transform: [{ translateY: slideAnim }],
          backgroundColor: bg,
          paddingTop,
        },
      ]}
    >
      <View style={styles.content}>
        {showSpinner ? (
          <ActivityIndicator size="small" color={textColor} style={styles.icon} />
        ) : (
          <Ionicons name={iconName} size={16} color={textColor} style={styles.icon} />
        )}
        <Text style={[styles.text, { color: textColor, fontSize: fontSize.xs }]}>
          {label}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
