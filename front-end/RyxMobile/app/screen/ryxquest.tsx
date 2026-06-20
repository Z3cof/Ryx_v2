import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  Animated,
  ActivityIndicator,
  Alert,
  FlatList,
  ViewToken,
} from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useLocalSearchParams, router, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar, type StatusBarStyle } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { RyxLoader } from '../../components/RyxLoader';
import {
  fetchQuests,
  generateQuests as apiGenerateQuests,
  completeQuest as apiCompleteQuest,
  type Quest,
  type UserQuestProgress,
} from '../../services/quests';
import { getCachedData } from '../../services/offlineStorage';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W - 40;

// ─── Semi-circular gauge ────────────────────────────────────────────────────
function GaugeArc({ percent }: { percent: number }) {
  const SIZE = 180;
  const CX = SIZE / 2;
  const CY = SIZE / 2 + 10;
  const R = 68;
  // arc from 210° to 330° (150° sweep)
  const START_DEG = 210;
  const SWEEP = 150;

  function polar(deg: number, r = R) {
    const rad = (deg * Math.PI) / 180;
    return {
      x: CX + r * Math.cos(rad),
      y: CY + r * Math.sin(rad),
    };
  }

  function arcPath(startDeg: number, endDeg: number, r = R) {
    const s = polar(startDeg, r);
    const e = polar(endDeg, r);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  const endDeg = START_DEG + (SWEEP * Math.min(100, Math.max(0, percent))) / 100;
  const tip = polar(endDeg);

  // gradient color based on percent
  const getColor = (p: number) => {
    if (p >= 80) return '#10b981'; // green
    if (p >= 50) return '#f59e0b'; // amber
    if (p >= 25) return '#f97316'; // orange
    return '#ef4444';              // red
  };

  return (
    <Svg width={SIZE} height={SIZE * 0.75} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      <Defs>
        <LinearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#ef4444" />
          <Stop offset="35%" stopColor="#f97316" />
          <Stop offset="65%" stopColor="#f59e0b" />
          <Stop offset="100%" stopColor="#10b981" />
        </LinearGradient>
      </Defs>
      {/* Track */}
      <Path
        d={arcPath(START_DEG, START_DEG + SWEEP)}
        stroke="rgba(0,0,0,0.08)"
        strokeWidth={10}
        fill="none"
        strokeLinecap="round"
      />
      {/* Fill */}
      {percent > 0 && (
        <Path
          d={arcPath(START_DEG, endDeg)}
          stroke="url(#gaugeGrad)"
          strokeWidth={10}
          fill="none"
          strokeLinecap="round"
        />
      )}
      {/* Tip dot */}
      {percent > 2 && (
        <Circle cx={tip.x} cy={tip.y} r={7} fill={getColor(percent)} />
      )}
    </Svg>
  );
}

// ─── Difficulty badge ────────────────────────────────────────────────────────
const DIFF_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  easy:   { bg: '#d1fae5', text: '#059669', label: 'Facile' },
  medium: { bg: '#fef3c7', text: '#d97706', label: 'Moyen' },
  hard:   { bg: '#fee2e2', text: '#dc2626', label: 'Difficile' },
};

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function RyxQuestScreen() {
  const insets = useSafeAreaInsets();
  const { ui, colors, spacing, radius, fontSize, isDark } = useAppTheme();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ userId?: string; userName?: string }>();
  const userId = params.userId || '';
  const userName = params.userName || '';
  const nav = useRouter();

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace({ pathname: '/screen/accueil', params: { userId, userName } });
    }
  }, [userId, userName]);

  const [quests, setQuests]                   = useState<Quest[]>([]);
  const [recentCompleted, setRecentCompleted] = useState<Quest[]>([]);
  const [progress, setProgress]               = useState<UserQuestProgress | null>(null);
  const [loading, setLoading]                 = useState(true);
  const [generating, setGenerating]           = useState(false);
  const [autoCompleting, setAutoCompleting]   = useState<Set<string>>(new Set());
  const [activeIdx, setActiveIdx]             = useState(0);
  const autoCompletedRef                      = useRef<Set<string>>(new Set());

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(
    async (silent = false) => {
      if (!userId) return;

      // Try loading from cache immediately so it's already ready
      try {
        const cached = await getCachedData<{ quests: Quest[]; recentCompleted: Quest[]; progress: UserQuestProgress }>(
          `cached_quests_${userId}`
        );
        if (cached) {
          setQuests(cached.quests || []);
          setRecentCompleted(cached.recentCompleted || []);
          setProgress(cached.progress || null);
        }
      } catch (err) {
        // ignore
      }

      if (!silent) setLoading(true);
      try {
        const res = await fetchQuests(userId);
        setQuests(res.quests);
        setRecentCompleted(res.recentCompleted);
        setProgress(res.progress);
      } catch (e) {
        if (!silent)
          Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible de charger RyxQuest');
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => { if (userId) void loadData(); }, [userId, loadData]);
  useFocusEffect(useCallback(() => { if (userId) void loadData(true); }, [userId, loadData]));

  // ── Auto-validation ────────────────────────────────────────────────────────
  // Triggered every time `quests` changes; silently completes any ready quest.
  useEffect(() => {
    if (!userId || quests.length === 0) return;

    const readyQuests = quests.filter((q) => {
      const done = q.currentValue >= q.targetValue;
      return done && !autoCompletedRef.current.has(q._id);
    });

    if (readyQuests.length === 0) return;

    readyQuests.forEach(async (q) => {
      // Mark so we don't retry on next render
      autoCompletedRef.current.add(q._id);
      setAutoCompleting((prev) => new Set([...prev, q._id]));

      try {
        const res = await apiCompleteQuest(userId, q._id);
        await loadData(true);
        let body = `${q.title}\n\n+${res.xpEarned} XP — continues comme ça !`;
        if (res.autoGenerated?.generated && res.autoGenerated.message) {
          body += `\n\n⚡ ${res.autoGenerated.message}`;
        }
        Alert.alert('🎉 Défi accompli !', body, [{ text: 'Super !', style: 'default' }]);
      } catch {
        // Quest might already be completed, ignore
      } finally {
        setAutoCompleting((prev) => {
          const n = new Set(prev);
          n.delete(q._id);
          return n;
        });
      }
    });
  }, [quests, userId, loadData]);

  const isCooldownActive = useMemo(() => {
    if (!progress?.nextQuestGenerationAt) return false;
    return new Date(progress.nextQuestGenerationAt).getTime() > Date.now();
  }, [progress?.nextQuestGenerationAt]);

  // ── Generate ───────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!userId || generating) return;
    setGenerating(true);
    try {
      const res = await apiGenerateQuests(userId);
      Alert.alert('RyxQuest ⚡', res.message);
      await loadData(true);
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Génération impossible');
    } finally {
      setGenerating(false);
    }
  };

  // ── viewable item tracking ─────────────────────────────────────────────────
  const onViewableChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]) setActiveIdx(viewableItems[0].index ?? 0);
    },
    []
  );
  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 60 });

  // ── Styles ─────────────────────────────────────────────────────────────────
  const BG   = isDark ? '#0f172a' : '#F2F2F7';
  const CARD = isDark ? '#1e293b' : '#ffffff';
  const TEXT = isDark ? '#f1f5f9' : '#0f172a';
  const SUB  = isDark ? '#94a3b8' : '#6b7280';
  const ACCENT = '#f59e0b';


  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={goBack}
          style={({ pressed }) => [
            styles.backBtn,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' },
            { opacity: pressed ? 0.6 : 1 }
          ]}
        >
          <Ionicons name="chevron-back" size={20} color={TEXT} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: TEXT }]}>RyxQuest</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
      >
        {/* ── Progress summary ─────────────────────────────────────── */}
        {progress && (
          <View style={[styles.summaryRow]}>
            <View style={[styles.summaryPill, { backgroundColor: CARD }]}>
              <Text style={[styles.summaryNum, { color: TEXT }]}>{progress.xp}</Text>
              <Text style={[styles.summaryLbl, { color: SUB }]}>XP total</Text>
            </View>
            <View style={[styles.summaryPill, { backgroundColor: CARD }]}>
              <View style={styles.streakRow}>
                <Ionicons name="flame" size={14} color="#ef4444" />
                <Text style={[styles.summaryNum, { color: TEXT }]}>{progress.streakDays}j</Text>
              </View>
              <Text style={[styles.summaryLbl, { color: SUB }]}>Streak</Text>
            </View>
            <View style={[styles.summaryPill, { backgroundColor: CARD }]}>
              <Text style={[styles.summaryNum, { color: TEXT }]}>{progress.totalQuestsCompleted}</Text>
              <Text style={[styles.summaryLbl, { color: SUB }]}>Complétés</Text>
            </View>
            <View style={[styles.summaryPill, { backgroundColor: isDark ? '#1e3a5f' : '#dbeafe' }]}>
              <Text style={[styles.summaryNum, { color: isDark ? '#60a5fa' : '#1d4ed8', fontSize: 11 }]} numberOfLines={1}>
                {progress.level?.name || 'Apprenti'}
              </Text>
              <Text style={[styles.summaryLbl, { color: SUB }]}>Niveau</Text>
            </View>
          </View>
        )}

        {loading && !progress ? (
          <View style={{ paddingVertical: 60, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={ACCENT} />
          </View>
        ) : (
          <>
            {/* ── Quest cards (horizontal swiper) ──────────────────────── */}
            {quests.length > 0 ? (
              <>
                <FlatList
                  data={quests}
                  horizontal
                  pagingEnabled
                  snapToInterval={CARD_W + 16}
                  decelerationRate="fast"
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}
                  keyExtractor={(q) => q._id}
                  onViewableItemsChanged={onViewableChanged}
                  viewabilityConfig={viewConfig.current}
                  renderItem={({ item: q }) => {
                    const pct =
                      q.targetValue > 0
                        ? Math.min(100, Math.round((q.currentValue / q.targetValue) * 100))
                        : 0;
                    const isReady = pct >= 100;
                    const isAutoComp = autoCompleting.has(q._id);
                    const diff = DIFF_COLORS[q.difficulty] ?? DIFF_COLORS.easy;

                    return (
                      <View style={[styles.questCard, { backgroundColor: CARD, width: CARD_W }]}>
                        {/* AI badge */}
                        {q.generatedByAi && (
                          <View style={styles.aiChip}>
                            <Ionicons name="sparkles" size={10} color="#7c3aed" />
                            <Text style={styles.aiChipText}>Généré par Rixy</Text>
                          </View>
                        )}

                        {/* Gauge */}
                        <View style={styles.gaugeWrap}>
                          <GaugeArc percent={pct} />
                          <View style={styles.gaugeCenter}>
                            <Text style={[styles.gaugeNum, { color: TEXT }]}>{pct}</Text>
                            <Text style={[styles.gaugeSub, { color: SUB }]}>%</Text>
                          </View>
                        </View>

                        {/* Icon + title */}
                        <Text style={styles.questEmoji}>{q.icon || '⚡'}</Text>
                        <Text style={[styles.questTitle, { color: TEXT }]}>{q.title}</Text>

                        {/* Stats row */}
                        <View style={styles.statsRow}>
                          <View style={[styles.badge, { backgroundColor: diff.bg }]}>
                            <Text style={[styles.badgeText, { color: diff.text }]}>{diff.label}</Text>
                          </View>
                          <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : '#fef3c7' }]}>
                            <Ionicons name="flash" size={11} color={ACCENT} />
                            <Text style={[styles.badgeText, { color: ACCENT }]}>+{q.xpReward} XP</Text>
                          </View>
                          {q.expiresAt && (
                            <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(100,116,139,0.2)' : '#f1f5f9' }]}>
                              <Ionicons name="time-outline" size={11} color={SUB} />
                              <Text style={[styles.badgeText, { color: SUB }]}>
                                {Math.max(0, Math.ceil((new Date(q.expiresAt).getTime() - Date.now()) / 86400000))}j
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Description */}
                        <Text style={[styles.questDesc, { color: SUB }]}>{q.description}</Text>

                        {/* Progress bar (non first_action) */}
                        {q.type !== 'first_action' && (
                          <View style={styles.barSection}>
                            <View style={[styles.barBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb' }]}>
                              <View style={[styles.barFill, { width: `${pct}%` }]} />
                            </View>
                            <View style={styles.barLabels}>
                              <Text style={[styles.barText, { color: SUB }]}>
                                {q.currentValue.toLocaleString('fr-FR')}
                                {q.type === 'limit_category' || q.type === 'save_amount' ? ' FCFA' : 'x'}
                              </Text>
                              <Text style={[styles.barText, { color: SUB }]}>
                                {q.targetValue.toLocaleString('fr-FR')}
                                {q.type === 'limit_category' || q.type === 'save_amount' ? ' FCFA' : 'x'}
                              </Text>
                            </View>
                          </View>
                        )}

                        {/* CTA */}
                        <View style={[
                          styles.ctaBtn,
                          { backgroundColor: isReady ? '#0f172a' : isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb' },
                        ]}>
                          {isAutoComp ? (
                            <ActivityIndicator size="small" color={isReady ? '#fff' : SUB} />
                          ) : isReady ? (
                            <>
                              <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                              <Text style={styles.ctaBtnText}>Validation automatique en cours…</Text>
                            </>
                          ) : (
                            <>
                              <Ionicons name="hourglass-outline" size={16} color={SUB} />
                              <Text style={[styles.ctaBtnText, { color: SUB }]}>En cours…</Text>
                            </>
                          )}
                        </View>
                      </View>
                    );
                  }}
                />

                {/* Pagination dots */}
                {quests.length > 1 && (
                  <View style={styles.dots}>
                    {quests.map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.dot,
                          { backgroundColor: i === activeIdx ? TEXT : (isDark ? '#334155' : '#d1d5db') },
                          i === activeIdx && styles.dotActive,
                        ]}
                      />
                    ))}
                  </View>
                )}
              </>
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: CARD }]}>
                <Text style={{ fontSize: 44, marginBottom: 12 }}>{isCooldownActive ? '🏆' : '⚡'}</Text>
                <Text style={[styles.emptyTitle, { color: TEXT }]}>
                  {isCooldownActive ? 'Félicitations !' : 'Aucun défi actif'}
                </Text>
                <Text style={[styles.emptySub, { color: SUB }]}>
                  {isCooldownActive
                    ? "Tu as accompli toutes tes quêtes. Rixy prépare de nouveaux défis personnalisés pour toi."
                    : "Rixy peut générer des défis financiers intelligents adaptés à tes habitudes !"}
                </Text>
              </View>
            )}

            {/* ── Generate CTA (manuel si besoin de quêtes supplémentaires) ─ */}
            {quests.length < 5 && (
              isCooldownActive && progress?.nextQuestGenerationAt ? (
                <View
                  style={[
                    styles.generateBtn,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#e5e7eb',
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#d1d5db',
                    },
                  ]}
                >
                  <Ionicons
                    name="hourglass-outline"
                    size={18}
                    color={isDark ? '#94a3b8' : '#6b7280'}
                  />
                  <Text style={[styles.generateBtnText, { color: isDark ? '#94a3b8' : '#6b7280' }]}>
                    Nouveaux défis disponibles dans {Math.ceil(
                      (new Date(progress.nextQuestGenerationAt).getTime() - Date.now()) /
                        (24 * 60 * 60 * 1000)
                    )} jour{Math.ceil(
                      (new Date(progress.nextQuestGenerationAt).getTime() - Date.now()) /
                        (24 * 60 * 60 * 1000)
                    ) > 1
                      ? 's'
                      : ''}
                  </Text>
                </View>
              ) : (
                <Pressable
                  style={({ pressed }) => [styles.generateBtn, pressed && { opacity: 0.88 }]}
                  onPress={handleGenerate}
                  disabled={generating}
                >
                  {generating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={18} color="#fff" />
                      <Text style={styles.generateBtnText}>Générer d'autres défis avec Rixy</Text>
                    </>
                  )}
                </Pressable>
              )
            )}

            {/* ── Recently completed ────────────────────────────────────── */}
            {recentCompleted.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: TEXT }]}>Récemment accomplis</Text>
                {recentCompleted.map((q) => (
                  <View key={q._id} style={[styles.completedRow, { backgroundColor: CARD }]}>
                    <Text style={{ fontSize: 22 }}>{q.icon || '🏆'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.completedTitle, { color: TEXT }]}>{q.title}</Text>
                      <Text style={[styles.completedDate, { color: SUB }]}>
                        {q.completedAt
                          ? new Date(q.completedAt).toLocaleDateString('fr-FR', {
                              day: 'numeric', month: 'short',
                            })
                          : '—'}
                      </Text>
                    </View>
                    <View style={styles.xpBadge}>
                      <Ionicons name="checkmark-done" size={12} color="#10b981" />
                      <Text style={styles.xpBadgeText}>+{q.xpReward} XP</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <Text style={[styles.disclaimer, { color: SUB }]}>
              Rixy génère automatiquement de nouveaux défis quand tu en termines un. Tu peux aussi en demander manuellement ci-dessus.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingTop: 12 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },

  // Summary row
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  summaryPill: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  summaryNum: {
    fontSize: 16,
    fontWeight: '800',
  },
  summaryLbl: {
    fontSize: 9,
    fontWeight: '500',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },

  // Quest card
  questCard: {
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  aiChip: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(124,58,237,0.1)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
  },
  aiChipText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#7c3aed',
  },
  gaugeWrap: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: -10,
  },
  gaugeCenter: {
    position: 'absolute',
    bottom: 14,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  gaugeNum: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  gaugeSub: {
    fontSize: 14,
    fontWeight: '600',
    paddingTop: 14,
  },
  questEmoji: {
    fontSize: 32,
    marginBottom: 6,
  },
  questTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  questDesc: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 16,
  },
  barSection: {
    width: '100%',
    marginBottom: 16,
  },
  barBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  barFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 3,
  },
  barLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  barText: {
    fontSize: 10,
  },
  ctaBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 99,
  },
  ctaBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  // Pagination dots
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    marginBottom: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 18,
  },

  // Empty state
  emptyCard: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },

  // Generate button
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f59e0b',
    borderRadius: 99,
    paddingVertical: 15,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 24,
  },
  generateBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  // Completed section
  section: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
  },
  completedTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  completedDate: {
    fontSize: 10,
    marginTop: 2,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d1fae5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
  },
  xpBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },

  disclaimer: {
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 32,
    marginTop: 4,
    marginBottom: 8,
    opacity: 0.6,
  },
});
