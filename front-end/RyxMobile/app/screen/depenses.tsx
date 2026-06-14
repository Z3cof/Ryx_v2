import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar, type StatusBarStyle } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { RyxLoader } from '../../components/RyxLoader';
import { fetchDashboard, type DashboardData } from '../../services/dashboard';
import { formatMoney, walletCurrencyFromDashboard, type MoneyLocale } from '../../utils/currency';
import {
  deleteTransaction,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  fetchExpensesSummary,
  fetchExpensesByMonth,
  fetchIncomeByMonth,
  syncPendingTransactions,
  type ExpenseItem,
  type IncomeByMonth as ApiIncomeByMonth,
} from '../../services/expenses';
import { getPendingTransactions } from '../../services/offlineStorage';
import {
  buildExpenseDonutSegments,
  groupExpensesByCategory,
  groupIncomeByCategory,
} from '../../utils/expenseDonutData';
import {
  deleteRecurringRule,
  ensureRecurringMonth,
  fetchRecurringRules,
  migrateLocalRecurringTemplatesIfNeeded,
  type RecurringCadence,
  type RecurringRuleDto,
} from '../../services/recurring';
import {
  deleteProjectGoal,
  fetchProjects,
  type ProjectGoal,
} from '../../services/projects';
import { makeDepensesStyles, GRID_PADDING } from '../../components/depenses/depensesStyles';
import { animateLayoutEase } from '../../components/depenses/depensesUtils';
import { PeriodNavigator, type MainTab } from '../../components/depenses/PeriodNavigator';
import { MonthPickerModal } from '../../components/depenses/MonthPickerModal';
import { SortiesTab } from '../../components/depenses/SortiesTab';
import { EntreesTab } from '../../components/depenses/EntreesTab';
import { RecurrencesTab } from '../../components/depenses/RecurrencesTab';
import { ProjetsTab } from '../../components/depenses/ProjetsTab';
import { AddTransactionModal } from '../../components/depenses/AddTransactionModal';
import { EditTransactionModal } from '../../components/depenses/EditTransactionModal';
import { RecurringAddModal } from '../../components/depenses/RecurringAddModal';
import { RecurringEditModal } from '../../components/depenses/RecurringEditModal';
import { ProjectAddModal } from '../../components/depenses/ProjectAddModal';
import { ProjectEditModal } from '../../components/depenses/ProjectEditModal';
import { ProjectFillModal } from '../../components/depenses/ProjectFillModal';

export default function DepensesScreen() {
  const params = useLocalSearchParams<{ userId?: string; userName?: string; openAdd?: string; tab?: string }>();
  const insets = useSafeAreaInsets();
  const { ui, colors, primary, spacing, radius, fontSize, isDark } = useAppTheme();
  const { t, locale } = useTranslation();
  const dateLocaleTag = locale === 'en' ? 'en-US' : 'fr-FR';
  const styles = useMemo(
    () => makeDepensesStyles(ui, colors, primary, spacing, radius, fontSize, isDark),
    [ui, colors, primary, spacing, radius, fontSize, isDark]
  );

  const monthNames = useMemo(
    () => Array.from({ length: 12 }, (_, i) => t(`depenses.month.${i + 1}`)),
    [t]
  );

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // ─── Core state ───────────────────────────────────────────────
  const [data, setData] = useState<DashboardData | null>(null);
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof fetchExpensesSummary>> | null>(null);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [monthData, setMonthData] = useState<Awaited<ReturnType<typeof fetchExpensesByMonth>> | null>(null);
  const [incomeData, setIncomeData] = useState<ApiIncomeByMonth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [mainTab, setMainTab] = useState<MainTab>('sorties');
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [categoryItemsExpanded, setCategoryItemsExpanded] = useState<Record<string, boolean>>({});
  const [incomeCategoryExpanded, setIncomeCategoryExpanded] = useState<Record<string, boolean>>({});
  const [pendingTxCount, setPendingTxCount] = useState(0);

  // ─── Recurring state ──────────────────────────────────────────
  const [recurringRules, setRecurringRules] = useState<RecurringRuleDto[]>([]);
  const [recurringRulesLoading, setRecurringRulesLoading] = useState(false);
  const [recurringAddVisible, setRecurringAddVisible] = useState(false);
  const [recurringAddFlow, setRecurringAddFlow] = useState<'in' | 'out'>('out');
  const [recurringEditRule, setRecurringEditRule] = useState<RecurringRuleDto | null>(null);

  // ─── Projects state ───────────────────────────────────────────
  const [projects, setProjects] = useState<ProjectGoal[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectAddVisible, setProjectAddVisible] = useState(false);
  const [projectFillVisible, setProjectFillVisible] = useState(false);
  const [projectFillId, setProjectFillId] = useState<string | null>(null);
  const [projectEditVisible, setProjectEditVisible] = useState(false);
  const [projectEditTarget, setProjectEditTarget] = useState<ProjectGoal | null>(null);

  // ─── Transaction modals ───────────────────────────────────────
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addModalStep, setAddModalStep] = useState<'choice' | 'income' | 'expense'>('choice');
  const [txEditVisible, setTxEditVisible] = useState(false);
  const [txEditItem, setTxEditItem] = useState<ExpenseItem | null>(null);
  const [txEditFlow, setTxEditFlow] = useState<'in' | 'out'>('out');

  const userId = params.userId || '';
  const currency = walletCurrencyFromDashboard(data);

  // ─── Derived data ─────────────────────────────────────────────
  const recurringExpenseTemplates = useMemo(() => recurringRules.filter((r) => r.type === 'out'), [recurringRules]);
  const recurringIncomeTemplates = useMemo(() => recurringRules.filter((r) => r.type === 'in'), [recurringRules]);

  const expenses = monthData?.expenses ?? [];
  const expensesByCategory = groupExpensesByCategory(expenses);
  const totalDepensesSelected = monthData?.total ?? 0;
  const { segments: expenseDonutSegments, grandTotal: expenseDonutGrandTotal } = useMemo(
    () => buildExpenseDonutSegments(expensesByCategory), [expensesByCategory]
  );
  const incomeList = incomeData?.income ?? [];
  const totalIncomeSelected = incomeData?.total ?? 0;
  const incomeItemsForDonut = useMemo(
    (): ExpenseItem[] => incomeList.map((i) => ({
      id: i.id, title: i.title, desc: i.desc, amount: i.amount,
      amountValue: i.amountValue, currency: i.currency, createdAtIso: i.createdAtIso,
      date: i.date, type: i.type, category: i.category,
    })),
    [incomeList]
  );
  const incomeByCategory = useMemo(() => groupIncomeByCategory(incomeItemsForDonut), [incomeItemsForDonut]);
  const { segments: incomeDonutSegments, grandTotal: incomeDonutGrandTotal } = useMemo(
    () => buildExpenseDonutSegments(incomeByCategory, INCOME_CATEGORIES), [incomeByCategory]
  );

  // ─── Period navigation ────────────────────────────────────────
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);
  const minSelectableYear = currentYear - 5;
  const canGoNextPeriod = selectedYear < currentYear || (selectedYear === currentYear && selectedMonth < currentMonth);
  const canGoPrevPeriod = !(selectedYear <= minSelectableYear && selectedMonth <= 1);

  const goPrevPeriod = useCallback(() => {
    if (selectedYear <= minSelectableYear && selectedMonth <= 1) return;
    if (selectedMonth > 1) setSelectedMonth((m) => m - 1);
    else { setSelectedYear((y) => y - 1); setSelectedMonth(12); }
  }, [selectedMonth, selectedYear, minSelectableYear]);

  const goNextPeriod = useCallback(() => {
    if (selectedYear > currentYear || (selectedYear === currentYear && selectedMonth >= currentMonth)) return;
    if (selectedMonth < 12) setSelectedMonth((m) => m + 1);
    else { setSelectedYear((y) => y + 1); setSelectedMonth(1); }
  }, [selectedMonth, selectedYear, currentYear, currentMonth]);

  const periodCenterLabel = useMemo(() => {
    if (selectedYear === currentYear && selectedMonth === currentMonth) return t('depenses.periodThisMonth');
    return t('depenses.periodMonthYear', { month: monthNames[selectedMonth - 1], year: selectedYear });
  }, [selectedYear, selectedMonth, currentYear, currentMonth, monthNames, t]);

  // ─── Data loading ─────────────────────────────────────────────
  const checkPendingCount = useCallback(async () => {
    if (userId) {
      const pending = await getPendingTransactions(userId);
      setPendingTxCount(pending.length);
    }
  }, [userId]);

  const loadData = useCallback(
    async (mode: 'initial' | 'pull' | 'silent' = 'initial') => {
      if (!userId) {
        setError(t('accueil.sessionInvalid'));
        setLoading(false);
        return;
      }
      if (mode === 'initial') setLoading(true);
      else if (mode === 'pull') setRefreshing(true);
      setError(null);

      // Auto-sync pending transactions when loading or pulling down
      if (userId && (mode === 'initial' || mode === 'pull')) {
        try {
          await syncPendingTransactions(userId);
        } catch (syncErr) {
          console.warn('[Offline Sync] Automatic sync failed:', syncErr);
        }
      }

      try {
        const [dashboardRes, summaryRes] = await Promise.all([
          fetchDashboard(userId),
          fetchExpensesSummary(userId),
        ]);
        setData(dashboardRes);
        setSummary(summaryRes);
      } catch (e) {
        if (mode !== 'silent') {
          setError(e instanceof Error ? e.message : t('accueil.loadError'));
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
        await checkPendingCount();
      }
    },
    [userId, t, checkPendingCount]
  );

  useEffect(() => {
    if (userId) void loadData('initial');
  }, [userId, loadData]);
  useEffect(() => { if (params.openAdd === '1') { setAddModalStep('choice'); setAddModalVisible(true); } }, [params.openAdd]);
  useEffect(() => {
    const validTabs: MainTab[] = ['sorties', 'entrees', 'recurrences', 'projets'];
    if (params.tab && validTabs.includes(params.tab as MainTab)) {
      setMainTab(params.tab as MainTab);
    }
  }, [params.tab]);

  useEffect(() => {
    if (!userId || mainTab !== 'recurrences') return;
    let cancelled = false;
    (async () => {
      setRecurringRulesLoading(true);
      try {
        await migrateLocalRecurringTemplatesIfNeeded(userId);
        const rules = await fetchRecurringRules(userId);
        if (!cancelled) setRecurringRules(rules);
        const ens = await ensureRecurringMonth(userId, selectedYear, selectedMonth);
        if (!cancelled && ens.createdCount > 0) {
          const [e, i] = await Promise.all([fetchExpensesByMonth(userId, selectedYear, selectedMonth), fetchIncomeByMonth(userId, selectedYear, selectedMonth)]);
          setMonthData(e); setIncomeData(i);
        }
      } catch { if (!cancelled) setRecurringRules([]); }
      finally { if (!cancelled) setRecurringRulesLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [userId, mainTab, selectedYear, selectedMonth]);

  useEffect(() => {
    if (!userId || mainTab !== 'projets') return;
    let cancelled = false;
    (async () => {
      setProjectsLoading(true);
      try { const rows = await fetchProjects(userId); if (!cancelled) setProjects(rows); }
      catch { if (!cancelled) setProjects([]); }
      finally { if (!cancelled) setProjectsLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [userId, mainTab]);

  useEffect(() => {
    if (!userId || !summary) return;
    setCategoryItemsExpanded({}); setIncomeCategoryExpanded({});
    let cancelled = false;
    (async () => {
      try {
        const [e, i] = await Promise.all([fetchExpensesByMonth(userId, selectedYear, selectedMonth), fetchIncomeByMonth(userId, selectedYear, selectedMonth)]);
        if (!cancelled) { setMonthData(e); setIncomeData(i); }
      } catch { if (!cancelled) { setMonthData(null); setIncomeData(null); } }
    })();
    return () => { cancelled = true; };
  }, [userId, selectedYear, selectedMonth, summary]);

  // ─── Formatters ───────────────────────────────────────────────
  const moneyLocale: MoneyLocale = locale === 'en' ? 'en' : 'fr';
  const formatAmount = useCallback((n: number) => formatMoney(n, currency, moneyLocale), [currency, moneyLocale]);
  const formatListDate = useCallback((raw: string) => {
    const ms = Date.parse(raw);
    if (!Number.isNaN(ms)) return new Date(ms).toLocaleDateString(dateLocaleTag, { day: 'numeric', month: 'short', year: 'numeric' });
    return raw;
  }, [dateLocaleTag]);
  const formatRecurringCadenceLabel = useCallback((c: RecurringCadence | undefined) => {
    const v = c ?? 'month';
    if (v === 'day') return t('depenses.recurringCadenceDay');
    if (v === 'week') return t('depenses.recurringCadenceWeek');
    return t('depenses.recurringCadenceMonth');
  }, [t]);

  // ─── Callbacks ────────────────────────────────────────────────
  const refreshMonthData = useCallback(async () => {
    try {
      const [e, i] = await Promise.all([fetchExpensesByMonth(userId, selectedYear, selectedMonth), fetchIncomeByMonth(userId, selectedYear, selectedMonth)]);
      setMonthData(e); setIncomeData(i);
    } catch { /* ignore */ }
    await checkPendingCount();
  }, [userId, selectedYear, selectedMonth, checkPendingCount]);

  const handleAddSuccess = useCallback(async () => {
    await loadData('silent');
    await refreshMonthData();
  }, [loadData, refreshMonthData]);

  const handleEditSuccess = useCallback(async () => {
    await loadData('silent');
    await refreshMonthData();
  }, [loadData, refreshMonthData]);

  const openTransactionActions = useCallback((item: ExpenseItem, flow: 'in' | 'out') => {
    Alert.alert(item.title, '', [
      { text: t('depenses.close'), style: 'cancel' },
      { text: t('depenses.editAction'), onPress: () => { setTxEditItem(item); setTxEditFlow(flow); setTxEditVisible(true); } },
      { text: t('depenses.deleteAction'), style: 'destructive', onPress: () => {
        Alert.alert(t('depenses.recurrencesDeleteTitle'), t('depenses.recurrencesDeleteBody'), [
          { text: t('depenses.close'), style: 'cancel' },
          { text: t('depenses.recurrencesDeleteConfirm'), style: 'destructive', onPress: async () => {
            try {
              await deleteTransaction(item.id);
              await loadData('silent');
              await refreshMonthData();
            }
            catch (e) { Alert.alert(t('depenses.errGeneric'), e instanceof Error ? e.message : t('depenses.errSave')); }
          }},
        ]);
      }},
    ]);
  }, [t, refreshMonthData, loadData]);

  const confirmDeleteRecurring = useCallback((ruleId: string) => {
    Alert.alert(t('depenses.recurrencesDeleteTitle'), t('depenses.recurrencesDeleteBody'), [
      { text: t('depenses.close'), style: 'cancel' },
      { text: t('depenses.recurrencesDeleteConfirm'), style: 'destructive', onPress: async () => {
        try { await deleteRecurringRule(userId, ruleId); setRecurringRules((prev) => prev.filter((r) => r.id !== ruleId)); }
        catch (e) { Alert.alert(t('depenses.errGeneric'), e instanceof Error ? e.message : t('depenses.errSave')); }
      }},
    ]);
  }, [userId, t]);

  const openProjectActions = useCallback((p: ProjectGoal) => {
    Alert.alert(p.title, '', [
      { text: t('depenses.close'), style: 'cancel' },
      { text: t('depenses.editAction'), onPress: () => { setProjectEditTarget(p); setProjectEditVisible(true); } },
      { text: t('depenses.deleteAction'), style: 'destructive', onPress: () => {
        Alert.alert(t('depenses.projectsDeleteTitle'), t('depenses.projectsDeleteBody'), [
          { text: t('depenses.close'), style: 'cancel' },
          { text: t('depenses.projectsDeleteConfirm'), style: 'destructive', onPress: async () => {
            try { await deleteProjectGoal(userId, p.id); setProjects((prev) => prev.filter((x) => x.id !== p.id)); }
            catch (e) { Alert.alert(t('depenses.errGeneric'), e instanceof Error ? e.message : t('depenses.errSave')); }
          }},
        ]);
      }},
    ]);
  }, [t, userId]);

  const gradientSoft = ui.gradientSoft as [string, string, string, string];

  // ─── Render ───────────────────────────────────────────────────
  if (loading && !data) {
    return (
      <View style={[styles.container, styles.centered]}>
        <StatusBar style={ui.statusBar as StatusBarStyle} />
        <RyxLoader fullScreen />
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={[styles.container, styles.centered]}>
        <StatusBar style={ui.statusBar as StatusBarStyle} />
        <Ionicons name="cloud-offline" size={48} color={ui.textTertiary} />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryBtn} onPress={() => loadData('initial')}>
          <Text style={styles.retryBtnText}>{t('accueil.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style={ui.statusBar as StatusBarStyle} />
      <LinearGradient colors={gradientSoft} style={StyleSheet.absoluteFill} locations={[0, 0.2, 0.5, 1]} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData('pull')} colors={[primary.main]} />}
      >
        <PeriodNavigator
          styles={styles}
          canGoPrev={canGoPrevPeriod}
          canGoNext={canGoNextPeriod}
          onPrev={goPrevPeriod}
          onNext={goNextPeriod}
          periodLabel={periodCenterLabel}
          onOpenPicker={() => setMonthPickerVisible(true)}
          activeTab={mainTab}
          onChangeTab={setMainTab}
          topInset={insets.top}
        />

        {pendingTxCount > 0 ? (
          <View style={{
            marginHorizontal: GRID_PADDING,
            marginTop: spacing[3],
            padding: spacing[3],
            backgroundColor: primary.main + '15',
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: primary.main + '40',
            flexDirection: 'row',
            alignItems: 'center',
          }}>
            <Ionicons name="cloud-offline-outline" size={20} color={primary.main} style={{ marginRight: spacing[2] }} />
            <Text style={{
              color: ui.textSecondary,
              fontSize: fontSize.sm,
              fontWeight: '500',
              flex: 1,
            }}>
              {locale === 'en'
                ? `${pendingTxCount} pending transaction(s) will sync when online.`
                : `${pendingTxCount} transaction(s) en attente de synchronisation.`}
            </Text>
            <Pressable
              onPress={async () => {
                setRefreshing(true);
                try {
                  const res = await syncPendingTransactions(userId);
                  if (res.syncedCount > 0) {
                    Alert.alert(
                      locale === 'en' ? 'Sync successful!' : 'Synchronisation réussie !',
                      locale === 'en'
                        ? `${res.syncedCount} transaction(s) synchronized.`
                        : `${res.syncedCount} transaction(s) synchronisée(s) avec succès.`
                    );
                    await loadData('silent');
                    await refreshMonthData();
                  } else {
                    Alert.alert(
                      locale === 'en' ? 'Sync' : 'Synchronisation',
                      locale === 'en'
                        ? 'No transactions could be synced. Please check your internet connection.'
                        : 'Aucune transaction n\'a pu être synchronisée. Veuillez vérifier votre connexion internet.'
                    );
                  }
                } catch {
                  // ignore
                } finally {
                  setRefreshing(false);
                  await checkPendingCount();
                }
              }}
              style={{
                paddingVertical: spacing[1],
                paddingHorizontal: spacing[3],
                backgroundColor: primary.main,
                borderRadius: radius.sm,
              }}
            >
              <Text style={{ color: colors.white, fontSize: fontSize.xs, fontWeight: '600' }}>
                {locale === 'en' ? 'Sync' : 'Synchro'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.content}>
          <View style={{ paddingHorizontal: GRID_PADDING, paddingTop: spacing[5] }}>
            {mainTab === 'sorties' && (
              <SortiesTab
                styles={styles}
                totalDepenses={totalDepensesSelected}
                expenses={expenses}
                expenseDonutSegments={expenseDonutSegments}
                expenseDonutGrandTotal={expenseDonutGrandTotal}
                expensesByCategory={expensesByCategory}
                summary={summary}
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
                currentYear={currentYear}
                currentMonth={currentMonth}
                categoryItemsExpanded={categoryItemsExpanded}
                onToggleCategory={(id) => setCategoryItemsExpanded((prev) => ({ ...prev, [id]: !prev[id] }))}
                onItemLongPress={openTransactionActions}
                onAddExpense={() => { setAddModalStep('expense'); setAddModalVisible(true); }}
                formatAmount={formatAmount}
                formatListDate={formatListDate}
              />
            )}

            {mainTab === 'entrees' && (
              <EntreesTab
                styles={styles}
                totalIncome={totalIncomeSelected}
                incomeList={incomeItemsForDonut}
                incomeDonutSegments={incomeDonutSegments}
                incomeDonutGrandTotal={incomeDonutGrandTotal}
                incomeByCategory={incomeByCategory}
                incomeCategoryExpanded={incomeCategoryExpanded}
                onToggleCategory={(id) => setIncomeCategoryExpanded((prev) => ({ ...prev, [id]: !prev[id] }))}
                onItemLongPress={openTransactionActions}
                onAddIncome={() => { setAddModalStep('income'); setAddModalVisible(true); }}
                formatAmount={formatAmount}
                formatListDate={formatListDate}
              />
            )}

            {mainTab === 'recurrences' && (
              <RecurrencesTab
                styles={styles}
                recurringRulesLoading={recurringRulesLoading}
                recurringExpenseTemplates={recurringExpenseTemplates}
                recurringIncomeTemplates={recurringIncomeTemplates}
                onOpenEditor={(rule) => setRecurringEditRule(rule)}
                onDelete={confirmDeleteRecurring}
                onAddRecurring={(flow) => { setRecurringAddFlow(flow); setRecurringAddVisible(true); }}
                formatAmount={formatAmount}
                formatCadence={formatRecurringCadenceLabel}
              />
            )}

            {mainTab === 'projets' && (
              <ProjetsTab
                styles={styles}
                projects={projects}
                projectsLoading={projectsLoading}
                userId={userId}
                onProjectsChange={setProjects}
                onOpenActions={openProjectActions}
                onOpenFill={(id) => { setProjectFillId(id); setProjectFillVisible(true); }}
                onOpenAdd={() => setProjectAddVisible(true)}
                formatAmount={formatAmount}
              />
            )}
          </View>

          <MonthPickerModal
            styles={styles}
            visible={monthPickerVisible}
            onClose={() => setMonthPickerVisible(false)}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            onSelectYear={setSelectedYear}
            onSelectMonth={setSelectedMonth}
            currentYear={currentYear}
            currentMonth={currentMonth}
            yearOptions={yearOptions}
            monthNames={monthNames}
          />
        </View>
      </ScrollView>

      {/* ─── Modals ──────────────────────────────────────────── */}
      <AddTransactionModal
        styles={styles}
        visible={addModalVisible}
        initialStep={addModalStep}
        onClose={() => setAddModalVisible(false)}
        onSuccess={handleAddSuccess}
        userId={userId}
        currency={currency}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
      />

      <EditTransactionModal
        styles={styles}
        visible={txEditVisible}
        item={txEditItem}
        flow={txEditFlow}
        onClose={() => { setTxEditVisible(false); setTxEditItem(null); }}
        onSuccess={handleEditSuccess}
        currency={currency}
      />

      <RecurringAddModal
        styles={styles}
        visible={recurringAddVisible}
        initialFlow={recurringAddFlow}
        onClose={() => setRecurringAddVisible(false)}
        onSuccess={(rules) => { setRecurringRules(rules); refreshMonthData(); }}
        userId={userId}
        currency={currency}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
      />

      <RecurringEditModal
        styles={styles}
        rule={recurringEditRule}
        onClose={() => setRecurringEditRule(null)}
        onSuccess={(updated) => {
          setRecurringRules((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
          refreshMonthData();
        }}
        userId={userId}
      />

      <ProjectAddModal
        styles={styles}
        visible={projectAddVisible}
        onClose={() => setProjectAddVisible(false)}
        onSuccess={setProjects}
        userId={userId}
      />

      <ProjectEditModal
        styles={styles}
        visible={projectEditVisible}
        project={projectEditTarget}
        onClose={() => setProjectEditVisible(false)}
        onSuccess={(updated) => setProjects((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))}
        userId={userId}
      />

      <ProjectFillModal
        styles={styles}
        visible={projectFillVisible}
        projectId={projectFillId}
        onClose={() => setProjectFillVisible(false)}
        onSuccess={(updated) => setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))}
        userId={userId}
      />
    </View>
  );
}
