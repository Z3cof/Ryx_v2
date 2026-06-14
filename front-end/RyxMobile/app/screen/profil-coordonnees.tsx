import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar, type StatusBarStyle } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { UserAvatar } from '../../components/UserAvatar';
import { fetchSessionUser, updateUserProfile } from '../../services/auth';
import { ChangePhoneModal } from '../../components/ChangePhoneModal';

const GRID_PADDING = 20;
const MAX_AVATAR_CHARS = 480000;

function makeCoordonneesStyles(
  ui: ReturnType<typeof import('../../theme').getUi>,
  colors: typeof import('../../theme').colors,
  primary: (typeof import('../../theme').colors)['primary'],
  spacing: typeof import('../../theme').spacing,
  radius: typeof import('../../theme').radius,
  fontSize: typeof import('../../theme').fontSize
) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: ui.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing[4],
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: fontSize.lg,
      fontWeight: '700',
      color: ui.textPrimary,
    },
    hint: {
      fontSize: fontSize.sm,
      color: ui.textSecondary,
      lineHeight: 20,
      marginBottom: spacing[6],
    },
    label: {
      color: ui.textTitle,
      fontSize: fontSize.sm,
      fontWeight: '500',
      marginBottom: spacing[2],
      marginTop: spacing[2],
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
    error: {
      color: '#dc2626',
      fontSize: fontSize.sm,
      marginTop: spacing[3],
      textAlign: 'center',
    },
    saveBtn: {
      backgroundColor: primary.main,
      paddingVertical: spacing[4],
      borderRadius: radius.lg,
      alignItems: 'center',
      marginTop: spacing[6],
    },
    saveBtnPressed: { opacity: 0.92 },
    saveBtnDisabled: { opacity: 0.7 },
    saveBtnText: {
      color: colors.white,
      fontSize: fontSize.base,
      fontWeight: '600',
    },
    sectionLabel: {
      fontSize: fontSize.xs,
      fontWeight: '700',
      color: ui.textSecondary,
      marginBottom: spacing[2],
      marginTop: spacing[2],
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    avatarSection: { alignItems: 'center', marginBottom: spacing[6] },
    avatarActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: spacing[2],
      marginTop: spacing[4],
    },
    avatarBtnPrimary: {
      paddingVertical: spacing[2],
      paddingHorizontal: spacing[4],
      borderRadius: radius.lg,
      backgroundColor: primary.main,
    },
    avatarBtnPrimaryText: { color: colors.white, fontWeight: '600', fontSize: fontSize.sm },
    avatarBtnGhost: {
      paddingVertical: spacing[2],
      paddingHorizontal: spacing[4],
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: ui.border,
      backgroundColor: ui.surface,
    },
    avatarBtnGhostText: { color: ui.textSecondary, fontWeight: '600', fontSize: fontSize.sm },
    avatarHint: {
      fontSize: fontSize.xs,
      color: ui.textTertiary,
      marginTop: spacing[3],
      textAlign: 'center',
      paddingHorizontal: spacing[4],
      lineHeight: 18,
    },
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ProfilCoordonneesScreen() {
  const params = useLocalSearchParams<{ userId?: string }>();
  const insets = useSafeAreaInsets();
  const userId = params.userId || '';
  const { ui, colors, primary, spacing, radius, fontSize } = useAppTheme();
  const { t, locale } = useTranslation();
  const localeTag = locale === 'en' ? 'en' : 'fr-FR';
  const styles = useMemo(
    () => makeCoordonneesStyles(ui, colors, primary, spacing, radius, fontSize),
    [ui, colors, primary, spacing, radius, fontSize]
  );

  const gradientColors = ui.gradient as [string, string, string];

  const [loading, setLoading] = useState(!!userId);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [avatar, setAvatar] = useState('');
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [phoneE164, setPhoneE164] = useState<string | undefined>(undefined);
  const [changePhoneOpen, setChangePhoneOpen] = useState(false);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { user } = await fetchSessionUser();
      setName(user?.name || '');
      setEmail(user?.email || '');
      setAvatar(user?.avatar || '');
      setPhoneE164(user?.phoneE164);
    } catch {
      setError(t('profil.loadError'));
    } finally {
      setLoading(false);
    }
  }, [userId, t]);

  const phoneDisplay = useMemo(() => {
    if (!phoneE164?.trim()) return '—';
    const p = parsePhoneNumberFromString(phoneE164.trim());
    return p?.isValid() ? p.formatInternational() : phoneE164;
  }, [phoneE164]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    if (!userId) return;
    const n = name.trim();
    const e = email.trim().toLowerCase();
    if (!n) {
      setError(t('profil.nameRequired'));
      return;
    }
    if (!e || !EMAIL_RE.test(e)) {
      setError(t('profil.emailInvalid'));
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await updateUserProfile(userId, { name: n, email: e });
      Alert.alert(t('profil.savedTitle'), t('profil.savedBody'), [
        { text: t('profil.ok'), onPress: () => router.back() },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('profil.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const pickAvatar = async () => {
    if (!userId || savingAvatar) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('profil.galleryTitle'), t('profil.galleryBody'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.65,
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.base64) return;
    const asset = result.assets[0];
    const mime = asset.mimeType || 'image/jpeg';
    const prefix = mime.includes('png') ? 'image/png' : 'image/jpeg';
    const dataUrl = `data:${prefix};base64,${asset.base64}`;
    if (dataUrl.length > MAX_AVATAR_CHARS) {
      Alert.alert(t('profil.avatarHeavyTitle'), t('profil.avatarHeavyBody'));
      return;
    }
    setSavingAvatar(true);
    try {
      await updateUserProfile(userId, { avatar: dataUrl });
      setAvatar(dataUrl);
    } catch (e) {
      Alert.alert(t('parametres.error'), e instanceof Error ? e.message : t('profil.avatarSaveError'));
    } finally {
      setSavingAvatar(false);
    }
  };

  const confirmRemoveAvatar = async () => {
    if (!userId) return;
    setSavingAvatar(true);
    try {
      await updateUserProfile(userId, { avatar: null });
      setAvatar('');
    } catch (e) {
      Alert.alert(t('parametres.error'), e instanceof Error ? e.message : t('profil.avatarDeleteError'));
    } finally {
      setSavingAvatar(false);
    }
  };

  const removeAvatar = () => {
    if (!userId || savingAvatar || !avatar) return;
    Alert.alert(t('profil.removePhotoTitle'), t('profil.removePhotoBody'), [
      { text: t('profil.cancel'), style: 'cancel' },
      { text: t('profil.removePhotoConfirm'), style: 'destructive', onPress: () => void confirmRemoveAvatar() },
    ]);
  };

  if (!userId) {
    return (
      <View style={styles.root}>
        <StatusBar style={ui.statusBar as StatusBarStyle} />
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} locations={[0, 0.35, 1]} />
        <View style={[styles.centered, { paddingHorizontal: GRID_PADDING }]}>
          <Text style={{ color: ui.textSecondary, textAlign: 'center', marginBottom: spacing[4] }}>
            {t('profil.invalidSession')}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed]}
            onPress={() => router.back()}
          >
            <Text style={styles.saveBtnText}>{t('profil.back')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.root}>
        <StatusBar style={ui.statusBar as StatusBarStyle} />
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} locations={[0, 0.35, 1]} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={primary.main} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style={ui.statusBar as StatusBarStyle} />
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} locations={[0, 0.35, 1]} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + spacing[4],
            paddingHorizontal: GRID_PADDING,
            paddingBottom: spacing[10],
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <Pressable
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
              onPress={() => router.back()}
              hitSlop={12}
            >
              <Ionicons name="chevron-back" size={26} color={ui.textTitle} />
            </Pressable>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {t('profil.coordTitle')}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <Text style={styles.hint}>{t('profil.coordIntro')}</Text>

          <Text style={styles.sectionLabel}>{t('profil.sectionAvatar')}</Text>
          <View style={styles.avatarSection}>
            {savingAvatar ? (
              <ActivityIndicator size="large" color={primary.main} style={{ marginVertical: spacing[4] }} />
            ) : (
              <UserAvatar uri={avatar || null} size={96} />
            )}
            <View style={styles.avatarActions}>
              <Pressable
                style={({ pressed }) => [styles.avatarBtnPrimary, pressed && { opacity: 0.9 }]}
                onPress={() => void pickAvatar()}
                disabled={savingAvatar}
              >
                <Text style={styles.avatarBtnPrimaryText}>{t('profil.choosePhoto')}</Text>
              </Pressable>
              {avatar ? (
                <Pressable
                  style={({ pressed }) => [styles.avatarBtnGhost, pressed && { opacity: 0.85 }]}
                  onPress={removeAvatar}
                  disabled={savingAvatar}
                >
                  <Text style={styles.avatarBtnGhostText}>{t('profil.removeAvatarBtn')}</Text>
                </Pressable>
              ) : null}
            </View>
            <Text style={styles.avatarHint}>{t('profil.avatarHint')}</Text>
          </View>

          <Text style={styles.label}>{t('profil.displayName')}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t('profil.namePlaceholder')}
            placeholderTextColor={ui.textTertiary}
            autoCapitalize="words"
          />

          <Text style={styles.label}>{t('profil.email')}</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="exemple@email.com"
            placeholderTextColor={ui.textTertiary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>{t('profil.phoneLabel')}</Text>
          <Text style={[styles.input, { paddingVertical: spacing[3] + 2 }]}>{phoneDisplay}</Text>
          <Text style={[styles.avatarHint, { marginBottom: spacing[3], textAlign: 'left' }]}>
            {t('profil.phoneDisplayHint')}
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.avatarBtnGhost,
              { alignSelf: 'flex-start', marginBottom: spacing[2] },
              pressed && { opacity: 0.85 },
            ]}
            onPress={() => setChangePhoneOpen(true)}
          >
            <Text style={styles.avatarBtnGhostText}>{t('profil.phoneChangeBtn')}</Text>
          </Pressable>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [
              styles.saveBtn,
              pressed && !saving && styles.saveBtnPressed,
              saving && styles.saveBtnDisabled,
            ]}
            onPress={() => void handleSave()}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.saveBtnText}>{t('profil.saveChanges')}</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <ChangePhoneModal
        visible={changePhoneOpen}
        onClose={() => setChangePhoneOpen(false)}
        userId={userId}
        currentPhoneE164={phoneE164}
        localeTag={localeTag}
        onPhoneUpdated={() => void load()}
      />
    </View>
  );
}
