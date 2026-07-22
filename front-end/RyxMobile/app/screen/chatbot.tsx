import React, { useState, useCallback, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Dimensions,
  Image,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar, type StatusBarStyle } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AI_SERVICE_BASE_URL } from '../../config/api';
import { sendChatMessage, type ChatMessage } from '../../services/chatbot';
import { fetchSessionUser } from '../../services/auth';
import { getAuthToken } from '../../services/authSession';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from '../../hooks/useTranslation';

/** Renders a Rixy message with clean visual structure and converts emojis to vector Ionicons. */
function RichBotText({ text, style }: { text: string; style?: any }) {
  const { ui, primary, fontSize } = useAppTheme();

  // Helper to remove raw text emojis that fail to render on simulator due to missing AppleColorEmoji font
  const cleanLine = (str: string) => {
    return str
      .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const lines = text.split('\n');

  const isBullet = (line: string) => /^[-•–]\s/.test(line.trimStart());
  const bulletContent = (line: string) => line.trimStart().replace(/^[-•–]\s+/, '');

  const elements: React.ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    if (rawLine.trim() === '') {
      elements.push(<View key={key++} style={{ height: 6 }} />);
      continue;
    }

    const hasBulb = rawLine.includes('💡');
    const hasMoney = rawLine.includes('💰') || rawLine.includes('💵');
    const hasChart = rawLine.includes('📊') || rawLine.includes('📈');
    const hasWarning = rawLine.includes('⚠️');
    const hasTarget = rawLine.includes('🎯');
    const hasFlash = rawLine.includes('⚡');

    const line = cleanLine(rawLine);
    if (!line) continue;

    const iconPrefix = hasBulb ? (
      <Ionicons name="bulb" size={16} color="#eab308" style={{ marginRight: 6, marginTop: 2 }} />
    ) : hasMoney ? (
      <Ionicons name="cash-outline" size={16} color="#16a34a" style={{ marginRight: 6, marginTop: 2 }} />
    ) : hasChart ? (
      <Ionicons name="stats-chart" size={16} color="#2563eb" style={{ marginRight: 6, marginTop: 2 }} />
    ) : hasWarning ? (
      <Ionicons name="alert-circle" size={16} color="#dc2626" style={{ marginRight: 6, marginTop: 2 }} />
    ) : hasTarget ? (
      <Ionicons name="flag" size={16} color="#7c3aed" style={{ marginRight: 6, marginTop: 2 }} />
    ) : hasFlash ? (
      <Ionicons name="flash" size={16} color="#d97706" style={{ marginRight: 6, marginTop: 2 }} />
    ) : null;

    if (isBullet(rawLine)) {
      elements.push(
        <View key={key++} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }}>
          {iconPrefix || (
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: primary.main,
                marginTop: (fontSize.base ?? 15) * 0.55,
                marginRight: 8,
                flexShrink: 0,
              }}
            />
          )}
          <Text style={[style, { flex: 1 }]}>{cleanLine(bulletContent(rawLine))}</Text>
        </View>
      );
    } else if (iconPrefix) {
      elements.push(
        <View key={key++} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }}>
          {iconPrefix}
          <Text style={[style, { flex: 1 }]}>{line}</Text>
        </View>
      );
    } else {
      elements.push(
        <Text key={key++} style={[style, { marginBottom: 2 }]}>
          {line}
        </Text>
      );
    }
  }

  return <View>{elements}</View>;
}

const GRID_PADDING = 20;

let msgId = 0;
function nextId() {
  msgId += 1;
  return `m-${msgId}-${Date.now()}`;
}

function makeChatbotStyles(
  ui: ReturnType<typeof import('../../theme').getUi>,
  colors: typeof import('../../theme').colors,
  primary: any,
  spacing: typeof import('../../theme').spacing,
  radius: typeof import('../../theme').radius,
  fontSize: typeof import('../../theme').fontSize,
  screenWidth: number
) {
  const cardShadow = Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
    android: { elevation: 4 },
  });

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: ui.background },
    flex: { flex: 1 },
    header: { paddingBottom: spacing[3] },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
    headerIconWrap: {
      width: 52,
      height: 52,
      borderRadius: radius.lg,
      backgroundColor: primary.bg,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(37,99,235,0.2)',
    },
    headerText: { flex: 1 },
    kicker: { color: ui.textSecondary, fontSize: fontSize.sm },
    title: { color: ui.textPrimary, fontSize: 22, fontWeight: '800', marginTop: 2 },

    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: GRID_PADDING, paddingBottom: spacing[4], flexGrow: 1 },

    rowUser: { alignItems: 'flex-end', marginBottom: spacing[3] },
    bubbleUser: {
      maxWidth: screenWidth * 0.82,
      backgroundColor: primary.main,
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[4],
      borderRadius: radius.xl,
      borderBottomRightRadius: radius.sm,
      ...Platform.select({
        ios: { shadowColor: primary.main, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6 },
        android: { elevation: 3 },
      }),
    },
    bubbleUserText: { color: colors.white, fontSize: fontSize.base, lineHeight: 22 },

    rowBot: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: spacing[3], gap: spacing[2] },
    botAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: ui.surface,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: ui.border,
      ...cardShadow,
    },
    botAvatarImg: { width: 36, height: 36 },
    bubbleBot: {
      flex: 1,
      maxWidth: screenWidth * 0.78,
      backgroundColor: ui.surface,
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[4],
      borderRadius: radius.xl,
      borderBottomLeftRadius: radius.sm,
      borderWidth: 1,
      borderColor: ui.border,
      ...cardShadow,
    },
    bubbleBotText: { color: ui.textTitle, fontSize: fontSize.base, lineHeight: 22 },

    suggestions: { marginTop: spacing[2], marginBottom: spacing[4] },
    suggestionsLabel: {
      fontSize: fontSize.xs,
      fontWeight: '700',
      color: ui.textSecondary,
      marginBottom: spacing[2],
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    chipsWrap: { gap: spacing[2] },
    chip: {
      alignSelf: 'flex-start',
      backgroundColor: ui.surface,
      paddingVertical: spacing[2],
      paddingHorizontal: spacing[4],
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: 'rgba(37,99,235,0.35)',
    },
    chipPressed: { opacity: 0.85, backgroundColor: primary.bg },
    chipText: { color: primary.tintText, fontSize: fontSize.sm, fontWeight: '600' },

    typingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] },
    typingText: { fontSize: fontSize.sm, color: ui.textSecondary, fontStyle: 'italic' },

    inputBar: {
      paddingHorizontal: GRID_PADDING,
      paddingTop: spacing[2],
      borderTopWidth: 1,
      borderTopColor: ui.border,
      backgroundColor: ui.surface,
    },
    inputInner: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      backgroundColor: ui.surfaceMuted,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: ui.border,
      paddingLeft: spacing[4],
      paddingRight: spacing[1],
      paddingVertical: spacing[1],
      minHeight: 48,
      maxHeight: 120,
      ...cardShadow,
    },
    input: {
      flex: 1,
      fontSize: fontSize.base,
      color: ui.textPrimary,
      maxHeight: 100,
      paddingVertical: Platform.OS === 'ios' ? spacing[3] : spacing[2],
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: primary.main,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 2,
    },
    sendBtnDisabled: { backgroundColor: ui.textTertiary, opacity: 0.7 },
    sendBtnPressed: { opacity: 0.9 },
  });
}

export default function ChatbotScreen() {
  const params = useLocalSearchParams<{ userId?: string; userName?: string }>();
  const insets = useSafeAreaInsets();
  const paramUserId = params.userId?.trim() || '';
  const paramUserName = params.userName?.trim() || '';
  const [resolvedUserId, setResolvedUserId] = useState(paramUserId);
  const [resolvedUserName, setResolvedUserName] = useState(paramUserName);
  const displayName = resolvedUserName || paramUserName;
  const userMongoId = resolvedUserId || paramUserId;
  const { ui, colors, primary, spacing, radius, fontSize, isDark } = useAppTheme();
  const { t, locale } = useTranslation();
  const screenWidth = Dimensions.get('window').width;

  const welcomeText = useMemo(
    () =>
      displayName
        ? t('assistant.welcomeNamed', { name: displayName })
        : t('assistant.welcome'),
    [displayName, t]
  );

  const suggestionChips = useMemo(
    () => [t('assistant.sug1'), t('assistant.sug2'), t('assistant.sug3')],
    [t]
  );
  const styles = useMemo(
    () => makeChatbotStyles(ui, colors, primary, spacing, radius, fontSize, screenWidth),
    [ui, colors, primary, spacing, radius, fontSize, screenWidth]
  );

  const scrollRef = useRef<ScrollView>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  /** Clavier ouvert : on réduit le padding bas (sinon KAV + marge tab = zone de saisie trop haute). */
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (paramUserId) {
      setResolvedUserId(paramUserId);
      if (paramUserName) setResolvedUserName(paramUserName);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const token = await getAuthToken();
        if (!token || cancelled) return;
        const { user } = await fetchSessionUser();
        if (cancelled) return;
        setResolvedUserId(user._id);
        setResolvedUserName(user.name?.trim() || '');
      } catch {
        /* session invalide ou hors ligne */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [paramUserId, paramUserName]);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = () => setKeyboardOpen(true);
    const onHide = () => setKeyboardOpen(false);
    const subShow = Keyboard.addListener(showEvt, onShow);
    const subHide = Keyboard.addListener(hideEvt, onHide);
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  useLayoutEffect(() => {
    setMessages((prev) => {
      if (prev.length === 0) {
        return [{ id: nextId(), role: 'assistant', text: welcomeText, createdAt: Date.now() }];
      }
      if (prev.length === 1 && prev[0].role === 'assistant') {
        return [{ ...prev[0], text: welcomeText }];
      }
      return prev;
    });
  }, [welcomeText]);

  const gradientColors = ui.gradient as [string, string, string];

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const appendAssistant = useCallback((text: string) => {
    setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', text, createdAt: Date.now() }]);
  }, []);

  useEffect(() => {
    console.log('[Ryx Chatbot] Screen loaded with parameters:', {
      userMongoId,
      displayName,
      params,
    });
  }, [userMongoId, displayName, params]);

  const handleSend = useCallback(
    async (text?: string) => {
      const raw = (text ?? input).trim();
      if (!raw || sending) return;
      setInput('');
      const historyBefore = messages;
      setMessages((prev) => [...prev, { id: nextId(), role: 'user', text: raw, createdAt: Date.now() }]);
      setSending(true);
      console.log('[Ryx Chatbot] Sending chat message to backend/AI service:', {
        raw,
        userMongoId,
        displayName,
        locale,
      });
      try {
        const reply = await sendChatMessage(raw, locale, {
          history: historyBefore,
          userName: displayName || undefined,
          userMongoId: userMongoId || undefined,
        });
        appendAssistant(reply);
      } catch (e) {
        const detail = e instanceof Error ? e.message : t('assistant.sendError');
        if (__DEV__) {
          console.error('[Ryx chatbot] Erreur envoi message', {
            iaUrl: AI_SERVICE_BASE_URL,
            err: e,
          });
          appendAssistant(detail);
        } else {
          appendAssistant(t('assistant.sendError'));
        }
      } finally {
        setSending(false);
      }
    },
    [input, sending, appendAssistant, locale, t, messages, displayName, userMongoId]
  );

  return (
    <View style={styles.container}>
      <StatusBar style={ui.statusBar as StatusBarStyle} />
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} locations={[0, 0.35, 1]} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={[styles.header, { paddingTop: insets.top + spacing[4], paddingHorizontal: GRID_PADDING }]}>
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => {
                if (router.canGoBack()) router.back();
                else router.replace({ pathname: '/screen/accueil', params: { userId: userMongoId, userName: displayName } });
              }}
              style={({ pressed }) => [
                {
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: spacing[1],
                },
                pressed && { opacity: 0.6 }
              ]}
            >
              <Ionicons name="chevron-back" size={20} color={ui.textPrimary} />
            </Pressable>
            <View style={styles.headerIconWrap}>
              <Ionicons name="chatbubbles" size={26} color={primary.main} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.kicker}>{t('assistant.headerKicker')}</Text>
              <Text style={styles.title}>{t('assistant.title')}</Text>
            </View>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {messages.map((m) =>
            m.role === 'user' ? (
              <View key={m.id} style={styles.rowUser}>
                <View style={styles.bubbleUser}>
                  <Text style={styles.bubbleUserText}>{m.text}</Text>
                </View>
              </View>
            ) : (
              <View key={m.id} style={styles.rowBot}>
                <View style={styles.botAvatar}>
                  <Image source={require('../../assets/images/logo_ryx.png')} style={styles.botAvatarImg} resizeMode="contain" />
                </View>
                <View style={styles.bubbleBot}>
                  <RichBotText text={m.text} style={styles.bubbleBotText} />
                </View>
              </View>
            )
          )}

          {messages.length === 1 && (
            <View style={styles.suggestions}>
              <Text style={styles.suggestionsLabel}>{t('assistant.suggestionsLabel')}</Text>
              <View style={styles.chipsWrap}>
                {suggestionChips.map((s) => (
                  <Pressable
                    key={s}
                    style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
                    onPress={() => handleSend(s)}
                    disabled={sending}
                  >
                    <Text style={styles.chipText}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {sending ? (
            <View style={styles.typingRow}>
              <ActivityIndicator size="small" color={primary.main} />
              <Text style={styles.typingText}>{t('assistant.typing')}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View
          style={[
            styles.inputBar,
            {
              paddingBottom: keyboardOpen
                ? Math.max(insets.bottom, spacing[2]) + spacing[2]
                : insets.bottom + 88,
            },
          ]}
        >
          <View style={styles.inputInner}>
            <TextInput
              style={styles.input}
              placeholder={t('assistant.inputPlaceholder')}
              placeholderTextColor={ui.textTertiary}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => handleSend()}
              returnKeyType="send"
              editable={!sending}
              multiline
              maxLength={2000}
            />
            <Pressable
              style={({ pressed }) => [styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled, pressed && styles.sendBtnPressed]}
              onPress={() => handleSend()}
              disabled={!input.trim() || sending}
            >
              <Ionicons name="arrow-up" size={22} color={colors.white} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
