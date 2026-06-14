import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Switch,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar, type StatusBarStyle } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { RyxLoader } from '../../components/RyxLoader';
import { UserAvatar } from '../../components/UserAvatar';
import { fetchDashboard } from '../../services/dashboard';
import { clearAuthToken } from '../../services/authSession';
import { useAppTheme } from '../../hooks/useAppTheme';
import type { AppearancePreference } from '../../contexts/AppearanceContext';
import { useLocale, type LanguagePreference } from '../../hooks/useLocale';
import { useTranslation } from '../../hooks/useTranslation';

const GRID_PADDING = 20;

const APP_VERSION =
  typeof Constants.expoConfig?.version === 'string'
    ? Constants.expoConfig.version
    : '1.0.0';

function makeParametresStyles(
  ui: ReturnType<typeof import('../../theme').getUi>,
  spacing: typeof import('../../theme').spacing,
  radius: typeof import('../../theme').radius,
  fontSize: typeof import('../../theme').fontSize,
  primary: any,
  colors: typeof import('../../theme').colors
) {
  const cardShadow = Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
    android: { elevation: 4 },
  });

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: ui.background },
    centered: { justifyContent: 'center', alignItems: 'center' },
    scroll: { flex: 1, backgroundColor: 'transparent' },
    scrollContent: { paddingHorizontal: GRID_PADDING },

    pageKicker: { color: ui.textSecondary, fontSize: fontSize.sm, marginBottom: 2 },
    pageTitle: { color: ui.textPrimary, fontSize: 26, fontWeight: '800', marginBottom: spacing[5] },

    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: ui.surface,
      borderRadius: radius.xl,
      padding: spacing[5],
      marginBottom: spacing[6],
      borderWidth: 1,
      borderColor: ui.border,
      ...cardShadow,
    },
    profileAvatarWrap: { marginRight: spacing[4] },
    profileText: { flex: 1 },
    profileName: { fontSize: fontSize.lg, fontWeight: '800', color: ui.textPrimary },
    profileEmail: { fontSize: fontSize.sm, color: ui.textSecondary, marginTop: 4 },
    merchantBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 4,
      marginTop: spacing[2],
      backgroundColor: primary.bg,
      paddingHorizontal: spacing[2],
      paddingVertical: 4,
      borderRadius: radius.sm,
    },
    merchantBadgeText: { fontSize: 11, fontWeight: '600', color: primary.tintText },

    sectionLabel: {
      fontSize: fontSize.xs,
      fontWeight: '700',
      color: ui.textSecondary,
      marginBottom: spacing[2],
      marginTop: spacing[1],
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    card: {
      backgroundColor: ui.surface,
      borderRadius: radius.xl,
      marginBottom: spacing[5],
      borderWidth: 1,
      borderColor: ui.border,
      overflow: 'hidden',
      ...cardShadow,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[4],
    },
    rowPressable: {},
    rowPressed: { backgroundColor: ui.rowPressed },
    rowIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: primary.bg,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing[3],
    },
    rowBody: { flex: 1 },
    rowTitle: { fontSize: fontSize.base, fontWeight: '600', color: ui.textTitle },
    rowSub: { fontSize: fontSize.xs, color: ui.textSecondary, marginTop: 2 },
    separator: { height: 1, backgroundColor: ui.border, marginLeft: spacing[4] + 40 + spacing[3] },
    versionText: { fontSize: fontSize.sm, fontWeight: '700', color: ui.textSecondary },

    appearanceOptionIconWrap: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: ui.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing[3],
    },

    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing[2],
      backgroundColor: ui.surface,
      borderRadius: radius.xl,
      paddingVertical: spacing[4],
      marginBottom: spacing[4],
      borderWidth: 1,
      borderColor: '#fecaca',
      ...cardShadow,
    },
    logoutText: { fontSize: fontSize.base, fontWeight: '700', color: '#b91c1c' },
    btnPressed: { opacity: 0.92 },

    footerHint: {
      fontSize: fontSize.xs,
      color: ui.textTertiary,
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: spacing[4],
    },

    emptyWrap: { flex: 1, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center' },
    emptyCard: {
      backgroundColor: ui.surface,
      borderRadius: radius.xl,
      padding: spacing[8],
      alignItems: 'center',
      width: '100%',
      maxWidth: 340,
      borderWidth: 1,
      borderColor: ui.border,
      ...cardShadow,
    },
    emptyTitle: {
      fontSize: fontSize.xl,
      fontWeight: '700',
      color: ui.textTitle,
      marginTop: spacing[3],
      marginBottom: spacing[2],
    },
    emptyText: {
      fontSize: fontSize.base,
      color: ui.textSecondary,
      textAlign: 'center',
      marginBottom: spacing[6],
    },
    primaryBtn: {
      backgroundColor: primary.main,
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[8],
      borderRadius: radius.lg,
    },
    primaryBtnText: { color: colors.white, fontWeight: '600', fontSize: fontSize.base },

    langModalRoot: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    langSheet: {
      backgroundColor: ui.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      borderWidth: 1,
      borderColor: ui.border,
      paddingTop: spacing[3],
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
        },
        android: { elevation: 16 },
      }),
    },
    langSheetTitle: {
      fontSize: fontSize.base,
      fontWeight: '700',
      color: ui.textTitle,
      textAlign: 'center',
      marginBottom: spacing[2],
      paddingHorizontal: spacing[4],
    },
    langOptionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[4],
    },
    langOptionPressed: { backgroundColor: ui.rowPressed },
    langOptionBody: { flex: 1 },
    langOptionTitle: { fontSize: fontSize.base, fontWeight: '600', color: ui.textTitle },
    langOptionSub: { fontSize: fontSize.xs, color: ui.textSecondary, marginTop: 2 },
    langSheetCancel: {
      marginTop: spacing[1],
      paddingVertical: spacing[4],
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: ui.border,
    },
    langSheetCancelText: { fontSize: fontSize.base, fontWeight: '600', color: primary.main },
  });
}

export default function ParametresScreen() {
  const params = useLocalSearchParams<{ userId?: string; userName?: string }>();
  const insets = useSafeAreaInsets();
  const { ui, preference, setPreference, colors, primary, spacing, radius, fontSize } = useAppTheme();
  const { languagePreference, setLanguagePreference, deviceLanguageCode } = useLocale();
  const { t } = useTranslation();

  const styles = useMemo(
    () => makeParametresStyles(ui, spacing, radius, fontSize, primary, colors),
    [ui, spacing, radius, fontSize, primary, colors]
  );

  const [loading, setLoading] = useState(!!params.userId);
  const [userName, setUserName] = useState(params.userName || t('parametres.defaultUser'));
  const [email, setEmail] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const appearanceOptions = useMemo(
    () =>
      [
        {
          key: 'system' as AppearancePreference,
          title: t('parametres.themeAuto'),
          sub: t('parametres.themeAutoSub'),
          icon: 'phone-portrait-outline' as keyof typeof Ionicons.glyphMap,
        },
        {
          key: 'light' as AppearancePreference,
          title: t('parametres.themeLight'),
          sub: t('parametres.themeLightSub'),
          icon: 'sunny-outline' as keyof typeof Ionicons.glyphMap,
        },
        {
          key: 'dark' as AppearancePreference,
          title: t('parametres.themeDark'),
          sub: t('parametres.themeDarkSub'),
          icon: 'moon-outline' as keyof typeof Ionicons.glyphMap,
        },
      ],
    [t]
  );

  const languageCurrentLabel = useMemo(() => {
    if (languagePreference === 'fr') return t('parametres.langFr');
    if (languagePreference === 'en') return t('parametres.langEn');
    return `${t('parametres.langSystem')} (${deviceLanguageCode})`;
  }, [languagePreference, t, deviceLanguageCode]);

  const languageModalOptions: {
    key: LanguagePreference;
    title: string;
    sub?: string;
  }[] = useMemo(
    () => [
      { key: 'fr', title: t('parametres.langFr') },
      { key: 'en', title: t('parametres.langEn') },
      {
        key: 'system',
        title: t('parametres.langSystem'),
        sub: t('parametres.langSystemSub', { code: deviceLanguageCode }),
      },
    ],
    [t, deviceLanguageCode]
  );

  const userId = params.userId || '';

  const navParams = { userId, userName: userName || params.userName || '' };

  const loadProfile = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchDashboard(userId);
      setUserName(data.user?.name || params.userName || t('parametres.defaultUser'));
      setEmail(data.user?.email || '');
      setAvatarUri(data.user?.avatar ? data.user.avatar : null);
    } catch {
      setEmail('');
      setAvatarUri(null);
    } finally {
      setLoading(false);
    }
  }, [userId, params.userName, t]);

  useFocusEffect(
    useCallback(() => {
      if (userId) void loadProfile();
    }, [userId, loadProfile])
  );

  const handleLogout = () => {
    Alert.alert(t('parametres.logoutAlertTitle'), t('parametres.logoutAlertBody'), [
      { text: t('parametres.cancel'), style: 'cancel' },
      {
        text: t('parametres.logoutConfirm'),
        style: 'destructive',
        onPress: () => {
          void clearAuthToken().finally(() => router.replace('/auth/login'));
        },
      },
    ]);
  };



  const gradientColors = ui.gradient as [string, string, string];

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <StatusBar style={ui.statusBar as StatusBarStyle} />
        <RyxLoader fullScreen />
      </View>
    );
  }

  if (!userId) {
    return (
      <View style={styles.container}>
        <StatusBar style={ui.statusBar as StatusBarStyle} />
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} locations={[0, 0.35, 1]} />
        <View style={[styles.emptyWrap, { paddingTop: insets.top + spacing[8] }]}>
          <View style={styles.emptyCard}>
            <Ionicons name="person-circle-outline" size={56} color={ui.textTertiary} />
            <Text style={styles.emptyTitle}>{t('parametres.sessionTitle')}</Text>
            <Text style={styles.emptyText}>{t('parametres.sessionText')}</Text>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
              onPress={() => {
                void clearAuthToken().finally(() => router.replace('/auth/login'));
              }}
            >
              <Text style={styles.primaryBtnText}>{t('parametres.loginBtn')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style={ui.statusBar as StatusBarStyle} />
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} locations={[0, 0.35, 1]} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + spacing[6], paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageKicker}>{t('parametres.pageKicker')}</Text>
        <Text style={styles.pageTitle}>{t('parametres.pageTitle')}</Text>

        <View style={styles.profileCard}>
          <View style={styles.profileAvatarWrap}>
            <UserAvatar uri={avatarUri} size={64} />
          </View>
          <View style={styles.profileText}>
            <Text style={styles.profileName}>{userName}</Text>
            {email ? <Text style={styles.profileEmail}>{email}</Text> : null}
          </View>
        </View>

        <Text style={styles.sectionLabel}>{t('parametres.sectionMyInfo')}</Text>
        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [styles.row, styles.rowPressable, pressed && styles.rowPressed]}
            onPress={() => router.push({ pathname: '/screen/mes-informations', params: { userId } })}
          >
            <View style={styles.rowIcon}>
              <Ionicons name="id-card-outline" size={22} color={primary.main} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>{t('parametres.profileTitle')}</Text>
              <Text style={styles.rowSub}>{t('parametres.profileSub')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={ui.textTertiary} />
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>{t('parametres.sectionPrefs')}</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Ionicons name="notifications-outline" size={22} color={primary.main} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>{t('parametres.notifications')}</Text>
              <Text style={styles.rowSub}>{t('parametres.notificationsSub')}</Text>
            </View>
            <Switch
              value={notifEnabled}
              onValueChange={setNotifEnabled}
              trackColor={{ false: colors.slate[200], true: primary.light }}
              thumbColor={notifEnabled ? primary.main : colors.slate[100]}
            />
          </View>
          <View style={styles.separator} />
          <Pressable
            style={({ pressed }) => [styles.row, styles.rowPressable, pressed && styles.rowPressed]}
            onPress={() => setLangMenuOpen(true)}
          >
            <View style={styles.rowIcon}>
              <Ionicons name="language-outline" size={22} color={primary.main} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>{t('parametres.langTitle')}</Text>
              <Text style={styles.rowSub}>{languageCurrentLabel}</Text>
            </View>
            <Ionicons name="chevron-down" size={20} color={ui.textTertiary} />
          </Pressable>
          <View style={styles.separator} />
          <Text style={[styles.sectionLabel, { marginTop: spacing[2], marginBottom: spacing[1], paddingHorizontal: spacing[4] }]}>
            {t('parametres.appearance')}
          </Text>
          {appearanceOptions.map((opt) => (
            <Pressable
              key={opt.key}
              style={({ pressed }) => [styles.row, styles.rowPressable, pressed && styles.rowPressed]}
              onPress={() => void setPreference(opt.key)}
            >
              <View style={styles.appearanceOptionIconWrap}>
                <Ionicons name={opt.icon} size={22} color={primary.main} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{opt.title}</Text>
                <Text style={styles.rowSub}>{opt.sub}</Text>
              </View>
              {preference === opt.key ? (
                <Ionicons name="checkmark-circle" size={24} color={primary.main} />
              ) : (
                <View style={{ width: 24 }} />
              )}
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>{t('parametres.sectionApp')}</Text>
        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [styles.row, styles.rowPressable, pressed && styles.rowPressed]}
            onPress={() => router.push({ pathname: '/screen/chatbot', params: navParams })}
          >
            <View style={styles.rowIcon}>
              <Ionicons name="help-circle-outline" size={22} color={primary.main} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>{t('parametres.helpTitle')}</Text>
              <Text style={styles.rowSub}>{t('parametres.helpSub')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={ui.textTertiary} />
          </Pressable>
          <View style={styles.separator} />
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Ionicons name="information-circle-outline" size={22} color={primary.main} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>{t('parametres.versionTitle')}</Text>
              <Text style={styles.rowSub}>{t('parametres.versionSub')}</Text>
            </View>
            <Text style={styles.versionText}>{APP_VERSION}</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.btnPressed]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={22} color="#b91c1c" />
          <Text style={styles.logoutText}>{t('parametres.logout')}</Text>
        </Pressable>

        <Text style={styles.footerHint}>{t('parametres.footerHint')}</Text>
      </ScrollView>

      <Modal
        visible={langMenuOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setLangMenuOpen(false)}
      >
        <View style={styles.langModalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setLangMenuOpen(false)} />
          <View style={[styles.langSheet, { paddingBottom: insets.bottom + spacing[4] }]}>
            <Text style={styles.langSheetTitle}>{t('parametres.langSheetTitle')}</Text>
            {languageModalOptions.map((opt) => (
              <Pressable
                key={opt.key}
                style={({ pressed }) => [
                  styles.langOptionRow,
                  pressed && styles.langOptionPressed,
                ]}
                onPress={() => {
                  void setLanguagePreference(opt.key);
                  setLangMenuOpen(false);
                }}
              >
                <View style={styles.langOptionBody}>
                  <Text style={styles.langOptionTitle}>{opt.title}</Text>
                  {opt.sub ? <Text style={styles.langOptionSub}>{opt.sub}</Text> : null}
                </View>
                {languagePreference === opt.key ? (
                  <Ionicons name="checkmark-circle" size={24} color={primary.main} />
                ) : (
                  <View style={{ width: 24 }} />
                )}
              </Pressable>
            ))}
            <Pressable
              style={({ pressed }) => [styles.langSheetCancel, pressed && styles.btnPressed]}
              onPress={() => setLangMenuOpen(false)}
            >
              <Text style={styles.langSheetCancelText}>{t('parametres.langClose')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
