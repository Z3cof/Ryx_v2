import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Platform,
  Animated,
  Easing,
  AppState,
  Alert,
  Modal,
  type AppStateStatus,
  Dimensions,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar, type StatusBarStyle } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { RyxLoader } from '../../components/RyxLoader';
import { UserAvatar } from '../../components/UserAvatar';
import { fetchDashboard, type DashboardData } from '../../services/dashboard';
import { formatMoney, walletCurrencyFromDashboard, type MoneyLocale } from '../../utils/currency';
import { INCOME_CATEGORIES, type ExpenseItem } from '../../services/expenses';
import {
  buildExpenseDonutSegments,
  groupExpensesByCategory,
  groupIncomeByCategory,
} from '../../utils/expenseDonutData';
import { ExpenseDonutSection } from '../../components/ExpenseDonutSection';
import { fetchMonthlyBalance } from '../../services/balance';
import { fetchProjects, type ProjectGoal } from '../../services/projects';
import { fetchQuests, completeQuest, type Quest, type UserQuestProgress } from '../../services/quests';

const { width } = Dimensions.get('window');
const GRID_PADDING = 20;

function makeAccueilStyles(
  ui: ReturnType<typeof import('../../theme').getUi>,
  colors: typeof import('../../theme').colors,
  primary: any,
  spacing: typeof import('../../theme').spacing,
  radius: typeof import('../../theme').radius,
  fontSize: typeof import('../../theme').fontSize,
  isDark: boolean
) {
  const shopHeroBg = isDark ? 'rgba(37, 99, 235, 0.14)' : primary.bg;
  const shopIconBg = isDark ? 'rgba(37, 99, 235, 0.22)' : primary.bg;
  const cardShadow = Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
    android: { elevation: 3 },
  });

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: ui.background },
    centered: { justifyContent: 'center', alignItems: 'center', padding: spacing[6] },
    errorText: { marginTop: spacing[3], color: ui.textTitle, fontSize: fontSize.base, textAlign: 'center' },
    retryBtn: {
      marginTop: spacing[4],
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[6],
      backgroundColor: primary.main,
      borderRadius: radius.lg,
    },
    retryBtnText: { color: colors.white, fontWeight: '600', fontSize: fontSize.sm },
    btnPressed: { opacity: 0.85 },
    scroll: { flex: 1, backgroundColor: 'transparent' },
    scrollContent: { paddingBottom: 40 },
    
    // Top Premium Card Blue Header
    headerContainer: {
      //backgroundColor: '#071d3d',
      //en mode sombre le background est blanc
      backgroundColor: isDark ? '#071d3d' : '#071d3d',
      borderBottomLeftRadius: 36,
      borderBottomRightRadius: 36,
      paddingHorizontal: GRID_PADDING,
      paddingBottom: 28,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 15 },
        android: { elevation: 8 },
      }),
    },
    navBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 26,
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    avatarWrap: {
      borderWidth: 1.5,
      borderColor: '#f59e0b',
      borderRadius: 99,
      padding: 1.5,
    },
    navWelcome: {
      color: 'rgba(255,255,255,0.6)',
      fontSize: 12,
    },
    navUserName: {
      color: colors.white,
      fontSize: 15,
      fontWeight: '700',
    },
    notificationBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.08)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    notifDot: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: '#ef4444',
      borderWidth: 1.5,
      borderColor: '#071d3d',
    },

    // ── Notification panel ─────────────────────────────────────────
    notifBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    notifSheet: {
      backgroundColor: ui.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      padding: spacing[5],
    },
    notifHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: ui.border,
      alignSelf: 'center',
      marginBottom: spacing[4],
    },
    notifSheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
      marginBottom: spacing[4],
    },
    notifSheetTitle: {
      fontSize: fontSize.base,
      fontWeight: '700',
      color: ui.textTitle,
      flex: 1,
    },
    notifBadgeCount: {
      backgroundColor: '#ef4444',
      borderRadius: radius.full,
      paddingHorizontal: spacing[2],
      paddingVertical: 2,
      minWidth: 22,
      alignItems: 'center',
    },
    notifBadgeCountText: {
      color: colors.white,
      fontSize: 11,
      fontWeight: '800',
    },
    notifRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing[3],
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: ui.border,
      gap: spacing[3],
    },
    notifRowLast: { borderBottomWidth: 0 },
    notifRowIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    notifRowIconOut: { backgroundColor: isDark ? 'rgba(220,38,38,0.18)' : '#fee2e2' },
    notifRowIconLow: { backgroundColor: isDark ? 'rgba(234,179,8,0.18)' : '#fef3c7' },
    notifRowBody: { flex: 1 },
    notifRowName: { fontSize: fontSize.sm, fontWeight: '600', color: ui.textTitle },
    notifRowSub: { fontSize: fontSize.xs, color: ui.textSecondary, marginTop: 2 },
    notifEmpty: {
      paddingVertical: spacing[6],
      alignItems: 'center',
      gap: spacing[2],
    },
    notifEmptyText: { fontSize: fontSize.sm, color: ui.textSecondary, textAlign: 'center' },
    notifGoToBtnWrap: { marginTop: spacing[4] },
    notifGoToBtn: {
      backgroundColor: primary.main,
      borderRadius: radius.lg,
      paddingVertical: spacing[3],
      alignItems: 'center',
    },
    notifGoBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.sm },
    notifCloseBtn: { alignItems: 'center', marginTop: spacing[3], paddingVertical: spacing[2] },
    notifCloseBtnText: { color: ui.textSecondary, fontSize: fontSize.sm },


    // Balance block
    balanceSection: {
      alignItems: 'center',
      marginBottom: 24,
    },
    balanceLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
    },
    balanceLabel: {
      color: 'rgba(255,255,255,0.7)',
      fontSize: 13,
      fontWeight: '500',
    },
    balanceText: {
      color: colors.white,
      fontSize: 32,
      fontWeight: '800',
      letterSpacing: -0.5,
    },
    accountCapsule: {
      marginTop: 8,
      backgroundColor: 'rgba(255,255,255,0.08)',
      paddingVertical: 5,
      paddingHorizontal: 12,
      borderRadius: 99,
    },
    accountText: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 11,
      fontWeight: '600',
    },
    
    // CTA Header buttons
    headerActionsRow: {
      flexDirection: 'row',
      gap: 14,
      marginTop: 6,
    },
    headerCtaBtn: {
      flex: 1,
      height: 48,
      backgroundColor: '#f59e0b',
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      ...Platform.select({
        ios: { shadowColor: '#f59e0b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6 },
        android: { elevation: 3 },
      }),
    },
    headerCtaBtnSecondary: {
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.15)',
      elevation: 0,
      shadowOpacity: 0,
    },
    headerCtaBtnText: {
      color: '#071d3d',
      fontWeight: '700',
      fontSize: 14,
    },
    headerCtaBtnTextSecondary: {
      color: colors.white,
    },

    // Horizontal action circle grid
    actionsGridCard: {
      backgroundColor: ui.surface,
      borderRadius: 24,
      marginHorizontal: GRID_PADDING,
      marginTop: -20,
      paddingVertical: 18,
      paddingHorizontal: 12,
      flexDirection: 'row',
      justifyContent: 'space-around',
      ...cardShadow,
      borderWidth: 1,
      borderColor: ui.border,
      zIndex: 10,
    },
    actionItem: {
      alignItems: 'center',
      width: 75,
    },
    actionCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
      borderWidth: 1.5,
      borderColor: ui.border,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    actionLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: ui.textSecondary,
      textAlign: 'center',
    },

    // Custom Merchant Promo Banner
    promoBanner: {
      marginHorizontal: GRID_PADDING,
      marginTop: 20,
      borderRadius: 20,
      overflow: 'hidden',
      ...cardShadow,
    },
    promoGradient: {
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    promoCharacterWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    promoTextWrap: {
      flex: 1,
    },
    promoTitle: {
      color: colors.white,
      fontSize: 15,
      fontWeight: '700',
      marginBottom: 4,
    },
    promoDesc: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: 11,
      lineHeight: 15,
    },

    // Recent Transactions Section
    sectionCard: {
      backgroundColor: ui.surface,
      borderRadius: 24,
      marginHorizontal: GRID_PADDING,
      marginTop: 20,
      padding: 18,
      ...cardShadow,
      borderWidth: 1,
      borderColor: ui.border,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: ui.textTitle,
    },
    sectionLink: {
      fontSize: 12,
      fontWeight: '600',
      color: primary.link,
    },
    txRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: ui.border,
    },
    txRowLast: {
      borderBottomWidth: 0,
      paddingBottom: 0,
    },
    txIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    txDetails: {
      flex: 1,
      minWidth: 0,
    },
    txTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: ui.textTitle,
      marginBottom: 3,
    },
    txDate: {
      fontSize: 11,
      color: ui.textTertiary,
    },
    txAmountWrap: {
      alignItems: 'flex-end',
    },
    txAmount: {
      fontSize: 13,
      fontWeight: '700',
    },
    txStatusTag: {
      fontSize: 9,
      fontWeight: '700',
      color: '#10b981',
      marginTop: 2,
    },
    txStatusOffline: {
      color: '#f59e0b',
    },

    // Economies / Dépenses mini capsules
    capsuleGrid: {
      flexDirection: 'row',
      gap: 12,
      marginHorizontal: GRID_PADDING,
      marginTop: 20,
    },
    capsuleCard: {
      flex: 1,
      backgroundColor: ui.surface,
      borderRadius: 16,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      ...cardShadow,
      borderWidth: 1,
      borderColor: ui.border,
    },
    capsuleIconWrapIn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: 'rgba(16,185,129,0.1)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    capsuleIconWrapOut: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: 'rgba(239,68,68,0.1)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    capsuleLabel: {
      fontSize: 10,
      color: ui.textTertiary,
      fontWeight: '600',
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    capsuleValue: {
      fontSize: 13,
      fontWeight: '700',
      color: ui.textTitle,
    },

    // General preview cards (Projects / Shop)
    generalCard: {
      backgroundColor: ui.surfaceMuted,
      borderRadius: 24,
      marginHorizontal: GRID_PADDING,
      marginTop: 20,
      padding: 18,
      ...cardShadow,
      borderWidth: 1,
      borderColor: ui.border,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    cardHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
      minWidth: 0,
    },
    cardIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: primary.bg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: ui.textTitle,
    },
    cardSub: {
      fontSize: 11,
      color: ui.textTertiary,
      marginTop: 1,
    },
    cardHeaderLink: {
      fontSize: 11,
      fontWeight: '700',
      color: primary.link,
      borderWidth: 1,
      borderColor: primary.tintBorder,
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: 6,
    },
    projectsTrack: {
      width: '100%',
      height: 6,
      borderRadius: 999,
      backgroundColor: ui.surfaceMuted,
      overflow: 'hidden',
      marginBottom: 10,
    },
    projectsFill: {
      height: '100%',
      borderRadius: 999,
      backgroundColor: primary.main,
    },
    projectsTotals: {
      fontSize: 12,
      fontWeight: '600',
      color: ui.textTitle,
      marginBottom: 10,
    },
    projectRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: ui.border,
    },
    projectRowLast: {
      borderBottomWidth: 0,
      paddingBottom: 0,
    },
    projectRowTitle: {
      fontSize: 12,
      color: ui.textSecondary,
      flex: 1,
      marginRight: 8,
    },
    projectRowAmount: {
      fontSize: 11,
      fontWeight: '600',
      color: ui.textTitle,
    },

    // Shop Preview specific styles
    shopHero: {
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
      backgroundColor: ui.surfaceMuted,
      borderWidth: 1,
      borderColor: ui.border,
    },
    shopHeroLabel: { fontSize: 11, fontWeight: '600', color: primary.link, marginBottom: 2 },
    shopHeroAmount: { fontSize: 20, fontWeight: '800', color: ui.textTitle },
    shopStatsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    shopStat: { flex: 1, backgroundColor: ui.surfaceMuted, borderRadius: 10, padding: 10 },
    shopStatLabel: { fontSize: 9, fontWeight: '600', color: ui.textSecondary, textTransform: 'uppercase' },
    shopStatValue: { fontSize: 14, fontWeight: '700', color: ui.textTitle, marginTop: 2 },
    shopMiniTitle: { fontSize: 11, fontWeight: '700', color: ui.textSecondary, marginBottom: 8 },
    shopMiniRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: ui.border,
    },
    shopMiniRowLast: { borderBottomWidth: 0 },
    shopMiniName: { fontSize: 12, color: ui.textTitle, flex: 1, marginRight: 8 },
    shopMiniAmt: { fontSize: 12, fontWeight: '700', color: primary.link },
    shopCta: {
      marginTop: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: primary.tintBorder,
      backgroundColor: ui.surface,
    },
    shopCtaText: { color: primary.link, fontWeight: '700', fontSize: 12 },

    // Collapsible stats block
    chartSection: {
      backgroundColor: ui.surface,
      borderRadius: 24,
      marginHorizontal: GRID_PADDING,
      marginTop: 20,
      padding: 18,
      ...cardShadow,
      borderWidth: 1,
      borderColor: ui.border,
    },
    chartsStack: { width: '100%', gap: 18 },
    chartBlock: { width: '100%' },
    chartBlockKicker: {
      fontSize: 10,
      fontWeight: '800',
      color: ui.textSecondary,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    chartBlockKickerOut: { color: '#dc2626' },
    chartBlockKickerIn: { color: '#16a34a' },
    chartEmpty: { alignItems: 'center', paddingVertical: 20 },
    chartEmptyText: { marginTop: 8, color: ui.textSecondary, fontSize: fontSize.sm },
  });
}

export default function AccueilScreen() {
  const params = useLocalSearchParams<{ userName?: string; userId?: string }>();
  const insets = useSafeAreaInsets();
  const { ui, colors, primary, spacing, radius, fontSize, isDark } = useAppTheme();
  const { t, locale } = useTranslation();
  const styles = useMemo(
    () => makeAccueilStyles(ui, colors, primary, spacing, radius, fontSize, isDark),
    [ui, colors, primary, spacing, radius, fontSize, isDark]
  );

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [monthlyBalance, setMonthlyBalance] = useState<number | null>(null);
  const [projectsPreview, setProjectsPreview] = useState<ProjectGoal[]>([]);
  const [categoryItemsExpanded, setCategoryItemsExpanded] = useState<Record<string, boolean>>({});
  const [incomeCategoryExpanded, setIncomeCategoryExpanded] = useState<Record<string, boolean>>({});

  // RyxQuest State
  const [questsPreview, setQuestsPreview] = useState<Quest[]>([]);
  const [questsProgress, setQuestsProgress] = useState<UserQuestProgress | null>(null);
  const [questsLoading, setQuestsLoading] = useState(false);
  
  // Custom designs features
  const [hideBalance, setHideBalance] = useState(false);
  const [notifPanelVisible, setNotifPanelVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // ── Computed: low stock notifications (Dummy/disabled as shop is deleted) ──
  const lowStockNotifs: any[] = [];
  const hasNotifs = false;


  const animHeader = useRef(new Animated.Value(0)).current;
  const animCards = useRef(new Animated.Value(0)).current;
  const animChart = useRef(new Animated.Value(0)).current;
  
  const dashboardLoadedRef = useRef(false);
  const skipFirstFocusRefresh = useRef(true);
  const homeEnterAnimationDoneRef = useRef(false);

  const userId = params.userId || '';
  const userName = data?.user?.name || params.userName || 'User';

  const loadDashboard = useCallback(
    async (mode: 'initial' | 'pull' | 'silent' = 'initial') => {
      if (!userId) {
        setError(t('accueil.sessionInvalid'));
        setLoading(false);
        return;
      }
      if (mode === 'initial') setLoading(true);
      else if (mode === 'pull') setRefreshing(true);
      setError(null);
      try {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth() + 1;
        const dashboardRes = await fetchDashboard(userId);
        setData(dashboardRes);
        dashboardLoadedRef.current = true;
        try {
          const projects = await fetchProjects(userId);
          setProjectsPreview(projects.slice(0, 3));
        } catch {
          setProjectsPreview([]);
        }
        const silent = mode === 'silent';
        if (!silent) setQuestsLoading(true);
        try {
          const questData = await fetchQuests(userId);
          setQuestsPreview(questData.quests.slice(0, 3));
          setQuestsProgress(questData.progress);

          // Auto-complete the dashboard exploration quest if active
          const explorerQuest = questData.quests.find(
            (q) => q.title === 'Explorateur de budget' && q.status === 'active'
          );
          if (explorerQuest) {
            void completeQuest(userId, explorerQuest._id)
              .then(() => fetchQuests(userId))
              .then((newQuestData) => {
                setQuestsPreview(newQuestData.quests.slice(0, 3));
                setQuestsProgress(newQuestData.progress);
              })
              .catch((err) => console.warn('Error auto-completing explorer quest:', err));
          }
        } catch (e) {
          console.warn('Error fetching quests:', e);
        } finally {
          if (!silent) setQuestsLoading(false);
        }
        try {
          const balanceRes = await fetchMonthlyBalance(userId, y, m);
          setMonthlyBalance(balanceRes.balance);
        } catch {
          setMonthlyBalance(null);
        }
      } catch (e) {
        if (mode === 'initial') dashboardLoadedRef.current = false;
        if (mode !== 'silent') {
          setError(e instanceof Error ? e.message : t('accueil.loadError'));
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userId, t]
  );

  useEffect(() => {
    dashboardLoadedRef.current = false;
    skipFirstFocusRefresh.current = true;
    homeEnterAnimationDoneRef.current = false;
    animHeader.setValue(0);
    animCards.setValue(0);
    animChart.setValue(0);
  }, [userId]);

  useEffect(() => {
    if (userId) void loadDashboard('initial');
  }, [userId, loadDashboard]);

  useFocusEffect(
    useCallback(() => {
      if (skipFirstFocusRefresh.current) {
        skipFirstFocusRefresh.current = false;
        return;
      }
      if (!userId || !dashboardLoadedRef.current) return;
      void loadDashboard('silent');
    }, [userId, loadDashboard])
  );

  useEffect(() => {
    if (!userId || !data) return;
    const id = setInterval(() => {
      void loadDashboard('silent');
    }, 60000);
    return () => clearInterval(id);
  }, [userId, data, loadDashboard]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active' && userId && dashboardLoadedRef.current) {
        void loadDashboard('silent');
      }
    });
    return () => sub.remove();
  }, [userId, loadDashboard]);

  useEffect(() => {
    setCategoryItemsExpanded({});
    setIncomeCategoryExpanded({});
  }, [data?.transactions]);

  useEffect(() => {
    if (!data || homeEnterAnimationDoneRef.current) return;
    homeEnterAnimationDoneRef.current = true;
    Animated.stagger(80, [
      Animated.timing(animHeader, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(animCards, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(animChart, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [data]);

  const currentMonthExpenses = data?.currentMonthExpenses ?? 0;
  const hasDefinedBalance = monthlyBalance != null;
  const solde = hasDefinedBalance
    ? Math.max(0, monthlyBalance! - currentMonthExpenses)
    : (data?.soldeDisponible ?? 0);
  const economie = solde;
  const displayedExpenses = currentMonthExpenses;
  const now = new Date();
  const dateLocaleTag = locale === 'en' ? 'en-US' : 'fr-FR';
  const dateLabel = now.toLocaleDateString(dateLocaleTag, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const homeOutflowItems = useMemo((): ExpenseItem[] => {
    if (!data?.transactions) return [];
    return data.transactions
      .filter((tx) => tx.type === 'out')
      .map((tx) => ({
        id: tx.id,
        title: tx.title,
        desc: tx.desc,
        amount: tx.amount,
        date: tx.date,
        type: tx.type,
        category: tx.category,
      }));
  }, [data?.transactions]);

  const { segments: homeDonutSegments, grandTotal: homeDonutGrandTotal } = useMemo(
    () => buildExpenseDonutSegments(groupExpensesByCategory(homeOutflowItems)),
    [homeOutflowItems]
  );

  const homeInflowItems = useMemo((): ExpenseItem[] => {
    if (!data?.transactions) return [];
    return data.transactions
      .filter((tx) => tx.type === 'in')
      .map((tx) => ({
        id: tx.id,
        title: tx.title,
        desc: tx.desc,
        amount: tx.amount,
        date: tx.date,
        type: tx.type,
        category: tx.category,
      }));
  }, [data?.transactions]);

  const { segments: homeIncomeDonutSegments, grandTotal: homeIncomeDonutGrandTotal } = useMemo(
    () =>
      buildExpenseDonutSegments(groupIncomeByCategory(homeInflowItems), INCOME_CATEGORIES),
    [homeInflowItems]
  );

  const formatListDate = useCallback(
    (raw: string) => {
      const ms = Date.parse(raw);
      if (!Number.isNaN(ms)) {
        return new Date(ms).toLocaleDateString(dateLocaleTag, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
      }
      return raw;
    },
    [dateLocaleTag]
  );

  const moneyLocale: MoneyLocale = locale === 'en' ? 'en' : 'fr';
  const walletCurrency = walletCurrencyFromDashboard(data);
  const formatAmount = useCallback(
    (n: number) => formatMoney(n, walletCurrency, moneyLocale),
    [walletCurrency, moneyLocale]
  );


  const projectsProgressPreview = useMemo(() => {
    const totalTarget = projectsPreview.reduce((s, p) => s + (Number(p.targetAmount) || 0), 0);
    const totalCurrent = projectsPreview.reduce((s, p) => s + (Number(p.currentAmount) || 0), 0);
    const percent = totalTarget > 0 ? Math.min(100, Math.round((totalCurrent / totalTarget) * 100)) : 0;
    return { totalTarget, totalCurrent, percent };
  }, [projectsPreview]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return t('accueil.greetingMorning');
    if (h < 18) return t('accueil.greetingAfternoon');
    return t('accueil.greetingEvening');
  })();

  const recentTransactions = useMemo(() => {
    if (!data?.transactions) return [];
    return data.transactions.slice(0, 3);
  }, [data?.transactions]);

  if (loading && !data) {
    return (
      <View style={[styles.container, styles.centered]}>
        <StatusBar style="light" />
        <RyxLoader fullScreen />
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={[styles.container, styles.centered]}>
        <StatusBar style="light" />
        <Ionicons name="cloud-offline" size={48} color={ui.textTertiary} />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryBtn} onPress={() => loadDashboard('initial')}>
          <Text style={styles.retryBtnText}>{t('accueil.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  const fadeIn = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
  });

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        ref={scrollViewRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadDashboard('pull')}
            colors={[ui.accent]}
            tintColor={ui.accent}
          />
        }
      >
        {/* Top Dark Blue Card Header */}
        <View style={[styles.headerContainer, { paddingTop: insets.top + 16 }]}>
  
            
           
          {/* Top navigation row */}
          <View style={styles.navBar}>
            <View style={styles.userInfo}>
              <View style={styles.avatarWrap}>
                <UserAvatar uri={data?.user?.avatar} size={42} />
              </View>
              <View>
                <Text style={styles.navWelcome}>{greeting}</Text>
                <Text style={styles.navUserName}>{userName}</Text>
              </View>
            </View>
            
            <Pressable
              onPress={() => setNotifPanelVisible(true)}
              style={({ pressed }) => [styles.notificationBtn, pressed && { opacity: 0.8 }]}
            >
              <Ionicons
                name={hasNotifs ? 'notifications' : 'notifications-outline'}
                size={20}
                color={colors.white}
              />
              {hasNotifs ? <View style={styles.notifDot} /> : null}
            </Pressable>

          </View>
          
          {/* le solde disponible */}
          <View style={styles.balanceSection}>
            <Pressable 
              onPress={() => setHideBalance(!hideBalance)}
              style={({ pressed }) => [styles.balanceLabelRow, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.balanceLabel}>{locale === 'en' ? 'Available Balance' : 'Solde disponible'}</Text>
              <Ionicons name={hideBalance ? "eye-off-outline" : "eye-outline"} size={16} color="rgba(255,255,255,0.7)" />
            </Pressable>
            
            <Text style={styles.balanceText} numberOfLines={1}>
              {hideBalance ? '••••••' : formatAmount(solde)}
            </Text>
            
            <View style={styles.accountCapsule}>
              <Text style={styles.accountText}>
                {locale === 'en' ? 'Account:' : 'Compte :'} Ryx-{(userName || '12345').slice(-7).toUpperCase()}
              </Text>
            </View>
          </View>
          
          {/* les buttons du header  */}
          <View style={styles.headerActionsRow}>
            <Pressable
              onPress={() => router.push({ pathname: '/screen/depenses', params: { userId, userName, openAdd: '1' } })}
              style={({ pressed }) => [styles.headerCtaBtn, pressed && styles.btnPressed]}
            >
              <Text style={styles.headerCtaBtnText}>{locale === 'en' ? 'Add' : 'Ajouter'}</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push({ pathname: '/screen/ryxquest', params: { userId, userName } })}
              style={({ pressed }) => [styles.headerCtaBtn, styles.headerCtaBtnSecondary, pressed && styles.btnPressed]}
            >
              <Text style={[styles.headerCtaBtnText, styles.headerCtaBtnTextSecondary]}>
                RyxQuest ⚡
              </Text>
            </Pressable>
          </View>
        </View>

        
        <View style={styles.actionsGridCard}>
          {/*les Dépenses*/}
          <Pressable
            onPress={() => router.push({ pathname: '/screen/depenses', params: { userId, userName, tab: 'sorties' } })}
            style={({ pressed }) => [styles.actionItem, pressed && { opacity: 0.7 }]}
          >
            <View style={[styles.actionCircle, { backgroundColor: isDark ? 'rgba(248,113,113,0.12)' : 'rgba(53, 22, 22, 0.08)', borderColor: ui.border }]}>
              <Ionicons name="arrow-up-circle-outline" size={22} color={ui.expense} />
            </View>
            <Text style={styles.actionLabel}>{locale === 'en' ? 'Expenses' : 'Dépenses'}</Text>
          </Pressable>

          {/*les Entrées */}
          <Pressable
            onPress={() => router.push({ pathname: '/screen/depenses', params: { userId, userName, tab: 'entrees' } })}
            style={({ pressed }) => [styles.actionItem, pressed && { opacity: 0.7 }]}
          >
            <View style={[styles.actionCircle, { backgroundColor: isDark ? 'rgba(52,211,153,0.12)' : 'rgba(16,185,129,0.08)', borderColor: ui.border }]}>
              <Ionicons name="arrow-down-circle-outline" size={22} color={ui.income} />
            </View>
            <Text style={styles.actionLabel}>{locale === 'en' ? 'Income' : 'Entrée'}</Text>
          </Pressable>

          {/*Les Projets */}
          <Pressable
            onPress={() => router.push({ pathname: '/screen/depenses', params: { userId, userName, tab: 'projets' } })}
            style={({ pressed }) => [styles.actionItem, pressed && { opacity: 0.7 }]}
          >
            <View style={[styles.actionCircle, { backgroundColor: isDark ? 'rgba(251,191,36,0.12)' : 'rgba(245,158,11,0.08)', borderColor: ui.border }]}>
              <Ionicons name="flag-outline" size={22} color={ui.accent} />
            </View>
            <Text style={styles.actionLabel}>{locale === 'en' ? 'Project' : 'Projet'}</Text>
          </Pressable>

          {/* Les Récurrences*/}
          <Pressable
            onPress={() => router.push({ pathname: '/screen/depenses', params: { userId, userName, tab: 'recurrences' } })}
            style={({ pressed }) => [styles.actionItem, pressed && { opacity: 0.7 }]}
          >
            <View style={[styles.actionCircle, { backgroundColor: isDark ? 'rgba(167,139,250,0.12)' : 'rgba(139,92,246,0.08)', borderColor: ui.border }]}>
              <Ionicons name="repeat-outline" size={22} color={isDark ? '#c4b5fd' : '#7c3aed'} />
            </View>
            <Text style={styles.actionLabel}>{locale === 'en' ? 'Recurring' : 'Récurrence'}</Text>
          </Pressable>
        </View>

        
        {/* Small Economie/Dépense Capsules */}
        <View style={styles.capsuleGrid}>
          <View style={styles.capsuleCard}>
            <View style={styles.capsuleIconWrapIn}>
              <Ionicons name="arrow-down" size={18} color="#10b981" />
            </View>
            <View>
              <Text style={styles.capsuleLabel}>{t('accueil.savings') || 'Revenus'}</Text>
              <Text style={styles.capsuleValue} numberOfLines={1}>{formatAmount(economie)}</Text>
            </View>
          </View>
          <View style={styles.capsuleCard}>
            <View style={styles.capsuleIconWrapOut}>
              <Ionicons name="arrow-up" size={18} color="#ef4444" />
            </View>
            <View>
              <Text style={styles.capsuleLabel}>{t('accueil.expenses') || 'Dépenses'}</Text>
              <Text style={styles.capsuleValue} numberOfLines={1}>{formatAmount(displayedExpenses)}</Text>
            </View>
          </View>
        </View>

        {/* Liste des transactions recentes*/}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{locale === 'en' ? 'Recent Transactions' : 'Transactions Récentes'}</Text>
            <Pressable onPress={() => router.push({ pathname: '/screen/depenses', params: { userId, userName } })}>
              <Text style={styles.sectionLink}>{locale === 'en' ? 'View more >' : 'Voir plus >'}</Text>
            </Pressable>
          </View>

          {recentTransactions.length === 0 ? (
            <Text style={{ color: ui.textTertiary, textAlign: 'center', marginVertical: 12 }}>
              {locale === 'en' ? 'No transactions yet' : 'Aucune transaction pour le moment'}
            </Text>
          ) : (
            recentTransactions.map((tx, idx) => {
              const isOutflow = tx.type === 'out';
              const amountVal = parseFloat(tx.amount) || 0;
              return (
                <View 
                  key={tx.id} 
                  style={[styles.txRow, idx === recentTransactions.length - 1 && styles.txRowLast]}
                >
                  <View style={[
                    styles.txIconContainer,
                    { backgroundColor: isOutflow ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)' }
                  ]}>
                    <Ionicons 
                      name={isOutflow ? "arrow-up" : "arrow-down"} 
                      size={18} 
                      color={isOutflow ? "#ef4444" : "#10b981"} 
                    />
                  </View>
                  
                  <View style={styles.txDetails}>
                    <Text style={styles.txTitle} numberOfLines={1}>{tx.title}</Text>
                    <Text style={styles.txDate}>{formatListDate(tx.date)}</Text>
                  </View>
                  
                  <View style={styles.txAmountWrap}>
                    <Text style={[
                      styles.txAmount,
                      { color: isOutflow ? ui.textTitle : '#10b981' }
                    ]}>
                      {isOutflow ? '-' : '+'}{formatAmount(amountVal)}
                    </Text>
                    <Text style={styles.txStatusTag}>Success</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Mes Projets Widget (Preserving projects functionality) */}
        <Animated.View style={[styles.generalCard, fadeIn(animCards)]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.cardIconWrap}>
                <Ionicons name="flag" size={18} color={primary.main} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.cardTitle} numberOfLines={1}>{t('accueil.projectsTitle')}</Text>
                <Text style={styles.cardSub}>{t('accueil.projectsSub')}</Text>
              </View>
            </View>
            <Pressable
              onPress={() => router.push({ pathname: '/screen/depenses', params: { userId, userName, tab: 'projets' } })}
            >
              <Text style={styles.cardHeaderLink}>{t('accueil.projectsOpen')}</Text>
            </Pressable>
          </View>
          
          {projectsPreview.length === 0 ? (
            <Text style={{ color: ui.textTertiary, fontSize: 12 }}>{t('accueil.projectsEmpty')}</Text>
          ) : (
            <>
              <View style={styles.projectsTrack}>
                <View
                  style={[
                    styles.projectsFill,
                    { width: `${Math.max(0, projectsProgressPreview.percent)}%` },
                  ]}
                />
              </View>
              <Text style={styles.projectsTotals}>
                {t('accueil.projectsTotals', {
                  current: formatAmount(projectsProgressPreview.totalCurrent),
                  target: formatAmount(projectsProgressPreview.totalTarget),
                })}
              </Text>
              {projectsPreview.map((p, idx) => (
                <View
                  key={p.id}
                  style={[
                    styles.projectRow,
                    idx === projectsPreview.length - 1 && styles.projectRowLast,
                  ]}
                >
                  <Text style={styles.projectRowTitle} numberOfLines={1}>
                    {p.title}
                  </Text>
                  <Text style={styles.projectRowAmount}>
                    {formatAmount(p.currentAmount)} / {formatAmount(p.targetAmount)}
                  </Text>
                </View>
              ))}
            </>
          )}
        </Animated.View>

        {/* RyxQuest Widget */}
        <Animated.View style={[styles.generalCard, fadeIn(animCards)]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.cardIconWrap, { backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)' }]}>
                <Ionicons name="flash" size={18} color="#d97706" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  RyxQuest ⚡
                </Text>
                <Text style={styles.cardSub}>Relève les défis de Rixy pour booster tes finances</Text>
              </View>
            </View>
            <Pressable onPress={() => router.push({ pathname: '/screen/ryxquest', params: { userId, userName } })}>
              <Text style={styles.cardHeaderLink}>Voir tout</Text>
            </Pressable>
          </View>

          {questsLoading ? (
            <View style={{ padding: 16, alignItems: 'center' }}>
              <RyxLoader fullScreen={false} />
            </View>
          ) : questsProgress ? (
            <View style={{ gap: 12 }}>
              {/* Level & Streak header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: ui.textTitle }}>
                    Niveau : {questsProgress.level?.name || 'Débutant'}
                  </Text>
                  <Text style={{ fontSize: 11, color: ui.textTertiary }}>
                    {questsProgress.xp} XP accumulés
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, gap: 4 }}>
                  <Ionicons name="flame" size={14} color="#ef4444" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#ef4444' }}>
                    {questsProgress.streakDays} jour{questsProgress.streakDays > 1 ? 's' : ''}
                  </Text>
                </View>
              </View>

              {/* Progress bar towards next level */}
              {questsProgress.level && questsProgress.level.maxXp !== null && (
                <View style={{ gap: 4 }}>
                  <View style={{ height: 6, backgroundColor: ui.border, borderRadius: 3, overflow: 'hidden' }}>
                    <View
                      style={{
                        height: '100%',
                        backgroundColor: '#d97706',
                        width: `${Math.min(
                          100,
                          Math.max(
                            0,
                            ((questsProgress.xp - questsProgress.level.minXp) /
                              (questsProgress.level.maxXp - questsProgress.level.minXp)) *
                              100
                          )
                        )}%`,
                      }}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 9, color: ui.textTertiary }}>{questsProgress.level.minXp} XP</Text>
                    <Text style={{ fontSize: 9, color: ui.textTertiary }}>{questsProgress.level.maxXp} XP pour le niveau suivant</Text>
                  </View>
                </View>
              )}

              {/* Active Quests Preview */}
              <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: ui.border, paddingTop: 10, gap: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: ui.textSecondary, marginBottom: 2 }}>
                  Défis actifs ({questsPreview.length}) :
                </Text>
                {questsPreview.length === 0 ? (
                  <Text style={{ fontSize: 12, color: ui.textTertiary, fontStyle: 'italic' }}>
                    Aucune quête active. Laisse Rixy t'en générer !
                  </Text>
                ) : (
                  questsPreview.map((q) => {
                    const progressPercent = q.targetValue > 0 ? Math.min(100, Math.round((q.currentValue / q.targetValue) * 100)) : 0;
                    return (
                      <View key={q._id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: ui.background, padding: 8, borderRadius: 10, borderWidth: 1, borderColor: ui.border }}>
                        <Text style={{ fontSize: 18 }}>{q.icon || '⚡'}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: ui.textTitle }} numberOfLines={1}>
                            {q.title}
                          </Text>
                          <Text style={{ fontSize: 10, color: ui.textSecondary }} numberOfLines={1}>
                            {q.description}
                          </Text>
                          {/* Mini progress bar if numeric */}
                          {q.type !== 'first_action' && (
                            <View style={{ height: 4, backgroundColor: ui.border, borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                              <View style={{ height: '100%', backgroundColor: ui.accent, width: `${progressPercent}%` }} />
                            </View>
                          )}
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#d97706' }}>+{q.xpReward} XP</Text>
                          {q.type !== 'first_action' && (
                            <Text style={{ fontSize: 9, color: ui.textTertiary }}>
                              {q.currentValue.toLocaleString('fr-FR')} / {q.targetValue.toLocaleString('fr-FR')}
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })
                )}
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.shopCta,
                  { borderColor: 'rgba(245,158,11,0.3)', backgroundColor: isDark ? 'rgba(245,158,11,0.05)' : 'rgba(245,158,11,0.02)' },
                  pressed && styles.btnPressed,
                ]}
                onPress={() => router.push({ pathname: '/screen/ryxquest', params: { userId, userName } })}
              >
                <Ionicons name="flash" size={16} color="#d97706" />
                <Text style={[styles.shopCtaText, { color: '#d97706' }]}>Lancer les défis</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ padding: 12, alignItems: 'center' }}>
              <Text style={{ color: ui.textTertiary, fontSize: 12 }}>Impossible de charger RyxQuest</Text>
            </View>
          )}
        </Animated.View>

        {/* Dépenses par catégorie Charts (Analytical Collapsible Block) */}
        <Animated.View style={[styles.chartSection, fadeIn(animChart)]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.cardIconWrap}>
                <Ionicons name="pie-chart" size={18} color={primary.main} />
              </View>
              <View>
                <Text style={styles.cardTitle}>{t('accueil.byCategory')}</Text>
                <Text style={styles.cardSub}>{t('accueil.categorySub')}</Text>
              </View>
            </View>
          </View>

          {homeDonutGrandTotal <= 0 && homeIncomeDonutGrandTotal <= 0 ? (
            <View style={styles.chartEmpty}>
              <Ionicons name="pie-chart-outline" size={32} color={ui.textTertiary} />
              <Text style={styles.chartEmptyText}>{t('accueil.chartEmpty')}</Text>
            </View>
          ) : (
            <View style={styles.chartsStack}>
              <View style={styles.chartBlock}>
                <Text style={[styles.chartBlockKicker, styles.chartBlockKickerOut]}>
                  {t('depenses.tabSorties')}
                </Text>
                <ExpenseDonutSection
                  flow="out"
                  segments={homeDonutSegments}
                  grandTotal={homeDonutGrandTotal}
                  formatAmount={formatAmount}
                  formatListDate={formatListDate}
                  categoryItemsExpanded={categoryItemsExpanded}
                  onToggleCategory={(categoryId) =>
                    setCategoryItemsExpanded((prev) => ({ ...prev, [categoryId]: !prev[categoryId] }))
                  }
                />
              </View>
              <View style={styles.chartBlock}>
                <Text style={[styles.chartBlockKicker, styles.chartBlockKickerIn]}>
                  {t('depenses.tabEntrees')}
                </Text>
                <ExpenseDonutSection
                  flow="in"
                  segments={homeIncomeDonutSegments}
                  grandTotal={homeIncomeDonutGrandTotal}
                  formatAmount={formatAmount}
                  formatListDate={formatListDate}
                  categoryItemsExpanded={incomeCategoryExpanded}
                  onToggleCategory={(categoryId) =>
                    setIncomeCategoryExpanded((prev) => ({ ...prev, [categoryId]: !prev[categoryId] }))
                  }
                />
              </View>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* ── Notification Panel ──────────────────────────────────── */}
      <Modal
        visible={notifPanelVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNotifPanelVisible(false)}
      >
        <Pressable
          style={styles.notifBackdrop}
          onPress={() => setNotifPanelVisible(false)}
        >
          <Pressable
            style={[styles.notifSheet, { paddingBottom: insets.bottom + 16 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.notifHandle} />

            {/* Header */}
            <View style={styles.notifSheetHeader}>
              <Ionicons
                name={hasNotifs ? 'warning' : 'checkmark-circle'}
                size={20}
                color={hasNotifs ? '#dc2626' : '#10b981'}
              />
              <Text style={styles.notifSheetTitle}>
                {hasNotifs ? '⚠️ Alertes stock' : 'Notifications'}
              </Text>
              {hasNotifs ? (
                <View style={styles.notifBadgeCount}>
                  <Text style={styles.notifBadgeCountText}>{lowStockNotifs.length}</Text>
                </View>
              ) : null}
            </View>

            {/* Content */}
            {hasNotifs ? (
              <>
                {lowStockNotifs.map((p, idx) => (
                  <View
                    key={p.id}
                    style={[
                      styles.notifRow,
                      idx === lowStockNotifs.length - 1 && styles.notifRowLast,
                    ]}
                  >
                    <View
                      style={[
                        styles.notifRowIconWrap,
                        p.stock === 0 ? styles.notifRowIconOut : styles.notifRowIconLow,
                      ]}
                    >
                      <Ionicons
                        name={p.stock === 0 ? 'close-circle' : 'alert-circle'}
                        size={18}
                        color={p.stock === 0 ? '#dc2626' : '#d97706'}
                      />
                    </View>
                    <View style={styles.notifRowBody}>
                      <Text style={styles.notifRowName} numberOfLines={1}>{p.name}</Text>
                      <Text style={styles.notifRowSub}>
                        {p.stock === 0
                          ? 'Rupture de stock — réapprovisionnement requis'
                          : `Stock bas : ${p.stock} unité${p.stock > 1 ? 's' : ''} restante${p.stock > 1 ? 's' : ''}`}
                      </Text>
                    </View>
                  </View>
                ))}

                {/* CTA → Boutique */}
                <View style={styles.notifGoToBtnWrap}>
                  <Pressable
                    style={styles.notifGoToBtn}
                    onPress={() => {
                      setNotifPanelVisible(false);
                      router.push({ pathname: '/screen/boutique', params: { userId, userName } });
                    }}
                  >
                    <Text style={styles.notifGoBtnText}>Gérer les stocks dans la boutique</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <View style={styles.notifEmpty}>
                <Ionicons name="checkmark-circle" size={40} color="#10b981" />
                <Text style={styles.notifEmptyText}>
                  Tout est en ordre — aucune notification.
                </Text>
              </View>
            )}

            <Pressable style={styles.notifCloseBtn} onPress={() => setNotifPanelVisible(false)}>
              <Text style={styles.notifCloseBtnText}>Fermer</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
