import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  Platform,
  Dimensions,
} from 'react-native';
import { router, useSegments, useGlobalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme, { getUi } from '@/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useTranslation } from '@/hooks/useTranslation';

const NAV_PILL_MARGIN = 20;

const MAIN_LEAVES = new Set([
  'accueil',
  'depenses',
  'chatbot',
  'ryxquest',
  'parametres',
]);

type MainTab = 'home' | 'expenses' | 'assistant' | 'quest' | 'settings';

function paramString(v: string | string[] | undefined): string {
  if (v == null) return '';
  return Array.isArray(v) ? (v[0] ?? '') : v;
}

function tabFromLeaf(leaf: string): MainTab | null {
  switch (leaf) {
    case 'accueil':
      return 'home';
    case 'depenses':
      return 'expenses';
    case 'chatbot':
      return 'assistant';
    case 'ryxquest':
      return 'quest';
    case 'parametres':
      return 'settings';
    default:
      return null;
  }
}

function makeNavStyles(
  ui: ReturnType<typeof getUi>,
  colors: typeof theme.colors,
  primary: any,
  spacing: typeof theme.spacing,
  screenWidth: number
) {
  const NAV_PILL_WIDTH = screenWidth - NAV_PILL_MARGIN * 2;
  return StyleSheet.create({
    navWrap: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 100,
      elevation: 24,
    },
    navPill: {
      width: NAV_PILL_WIDTH,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      backgroundColor: ui.navPillBg,
      borderRadius: 999,
      paddingVertical: spacing[2],
      paddingHorizontal: spacing[2],
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 16,
        },
        android: { elevation: 8 },
      }),
      borderWidth: 1,
      borderColor: ui.navBorder,
    },
    navItem: {
      alignItems: 'center',
      paddingVertical: spacing[2],
      paddingHorizontal: spacing[1],
      minWidth: 52,
    },
    navItemPressed: { opacity: 0.7 },
    navLabel: { fontSize: 10, color: ui.iconMuted, marginTop: 4 },
    navLabelActive: { color: ui.iconActive, fontWeight: '600' },
    navCenter: { alignItems: 'center', marginTop: -8 },
    navCenterPressed: { opacity: 0.85, transform: [{ scale: 0.95 }] },
    navCenterBtn: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    navCenterBtnActive: {
      borderWidth: 2,
      borderColor: primary.main,
      ...Platform.select({
        ios: {
          shadowColor: primary.main,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 10,
        },
        android: { elevation: 6 },
      }),
    },
    navCenterLogo: { width: 38, height: 38 },
    navCenterLabel: { fontSize: 11, color: ui.textSecondary, fontWeight: '600', marginTop: 4 },
    navCenterLabelActive: { color: primary.link, fontWeight: '700' },
  });
}

/**
 * Barre de navigation principale : rendue une seule fois dans `app/screen/_layout`
 * pour qu’elle ne soit pas recréée ni animée lors des changements d’écran.
 */
export function RyBottomNav() {
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const globalParams = useGlobalSearchParams<{ userId?: string; userName?: string }>();
  const { ui, colors, primary, spacing } = useAppTheme();
  const { t } = useTranslation();
  const screenWidth = Dimensions.get('window').width;

  const screenIdx = segments.lastIndexOf('screen');
  const hubLeaf = screenIdx >= 0 ? (segments[screenIdx + 1] ?? '') : '';
  const onMainHub = MAIN_LEAVES.has(hubLeaf);
  const active = tabFromLeaf(hubLeaf);

  const styles = useMemo(
    () => makeNavStyles(ui, colors, primary, spacing, screenWidth),
    [ui, colors, primary, spacing, screenWidth]
  );

  const navParams = useMemo(
    () => ({
      userId: paramString(globalParams.userId),
      userName: paramString(globalParams.userName),
    }),
    [globalParams.userId, globalParams.userName]
  );

  const go = useCallback(
    (
      tab: MainTab,
      pathnameTarget:
        | '/screen/accueil'
        | '/screen/depenses'
        | '/screen/chatbot'
        | '/screen/ryxquest'
        | '/screen/parametres'
    ) => {
      // Evite d'empiler la même page quand l'onglet actif est re-cliqué.
      if (active === tab) return;
      router.replace({ pathname: pathnameTarget, params: navParams });
    },
    [active, navParams]
  );

  if (!onMainHub || active == null) {
    return null;
  }

  const isHome = active === 'home';
  const isExpenses = active === 'expenses';
  const isAssistant = active === 'assistant';
  const isQuest = active === 'quest';
  const isSettings = active === 'settings';

  return (
    <View style={[styles.navWrap, { paddingBottom: insets.bottom + spacing[2] }]} pointerEvents="box-none">
      <View style={styles.navPill}>
        <Pressable
          style={({ pressed }) => [styles.navItem, pressed && styles.navItemPressed]}
          onPress={() => go('home', '/screen/accueil')}
        >
          <Ionicons name={isHome ? 'home' : 'home-outline'} size={24} color={isHome ? ui.iconActive : ui.iconMuted} />
          <Text style={[styles.navLabel, isHome && styles.navLabelActive]}>{t('nav.home')}</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.navItem, pressed && styles.navItemPressed]}
          onPress={() => go('expenses', '/screen/depenses')}
        >
          <Ionicons
            name={isExpenses ? 'wallet' : 'wallet-outline'}
            size={24}
            color={isExpenses ? ui.iconActive : ui.iconMuted}
          />
          <Text style={[styles.navLabel, isExpenses && styles.navLabelActive]}>{t('nav.expenses')}</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.navCenter, pressed && styles.navCenterPressed]}
          onPress={() => go('assistant', '/screen/chatbot')}
        >
          <View style={[styles.navCenterBtn, isAssistant && styles.navCenterBtnActive]}>
            <Image
              source={require('@/assets/images/logo_ryx.png')}
              style={styles.navCenterLogo}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.navCenterLabel, isAssistant && styles.navCenterLabelActive]}>
            {isAssistant ? t('nav.assistant') : t('nav.ryx')}
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.navItem, pressed && styles.navItemPressed]}
          onPress={() => go('quest', '/screen/ryxquest')}
        >
          <Ionicons
            name={isQuest ? 'flash' : 'flash-outline'}
            size={24}
            color={isQuest ? ui.iconActive : ui.iconMuted}
          />
          <Text style={[styles.navLabel, isQuest && styles.navLabelActive]}>{t('nav.ryxquest')}</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.navItem, pressed && styles.navItemPressed]}
          onPress={() => go('settings', '/screen/parametres')}
        >
          <Ionicons
            name={isSettings ? 'settings' : 'settings-outline'}
            size={24}
            color={isSettings ? ui.iconActive : ui.iconMuted}
          />
          <Text style={[styles.navLabel, isSettings && styles.navLabelActive]}>{t('nav.settings')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
