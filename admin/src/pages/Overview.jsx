import React, { useState, useEffect, useCallback } from 'react';
import { Users, Swords, Bot, Bell, Download, FileSpreadsheet, MoreHorizontal, RefreshCw } from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell
} from 'recharts';
import { api } from '../config/api';
import TopBar from '../components/TopBar';
import StatCard from '../components/StatCard';

const DONUT_COLORS = ['#3b82f6', '#10b981', '#ea580c', '#ef4444'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
        <div style={{ fontWeight: 700, marginBottom: 4, color: '#0f172a' }}>{label}</div>
        {payload.map(p => (
          <div key={p.name} style={{ color: p.color, fontWeight: 600 }}>
            {p.name === 'transactions' ? '📊 Transactions' : '👤 Nouveaux users'}: {p.value}
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function Overview() {
  const [stats, setStats] = useState(null);
  const [activityData, setActivityData] = useState([]);
  const [questStats, setQuestStats] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activityDays, setActivityDays] = useState(14);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, a, q, u] = await Promise.all([
        api.stats(),
        api.activity(activityDays),
        api.quests(),
        api.recentUsers(5),
      ]);
      setStats(s);
      setActivityData(a);
      setQuestStats(q);
      setRecentUsers(u.users || []);
    } catch (err) {
      console.error('Overview fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [activityDays]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const donutData = questStats ? [
    { name: 'Actives', value: questStats.statusBreakdown?.active || 0 },
    { name: 'Complétées', value: questStats.statusBreakdown?.completed || 0 },
    { name: 'IA générées', value: questStats.aiVsStatic?.ai || 0 },
    { name: 'Expirées', value: questStats.statusBreakdown?.expired || 0 },
  ].filter(d => d.value > 0) : [];

  const totalQuests = donutData.reduce((a, c) => a + c.value, 0);

  const handleExportCSV = () => {
    if (!recentUsers.length) return;
    const csv = ['Nom,Email,Date,Statut', ...recentUsers.map(u =>
      `${u.name},${u.email},${new Date(u.createdAt).toLocaleDateString('fr-FR')},${u.suspended ? 'Suspendu' : 'Actif'}`
    )].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'ryx_users.csv'; a.click();
  };

  return (
    <div className="page-enter" style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <TopBar title="Dashboard" />

      <div className="page">
        {/* Welcome + Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 className="page-greeting">Bienvenue, <span>Administrateur</span></h2>
            <p className="topbar-subtitle" style={{ marginTop: 2 }}>Vue globale de la plateforme Ryx en temps réel</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="topbar-btn" onClick={handleExportCSV} title="Exporter les utilisateurs récents en CSV">
              <FileSpreadsheet size={15} />
              <span>Export CSV</span>
            </button>
            <button className="topbar-btn" onClick={fetchAll} title="Rafraîchir toutes les données">
              <RefreshCw size={15} />
              <span>Actualiser</span>
            </button>
          </div>
        </div>

        {/* Stats KPI Grid */}
        <div className="stats-grid">
          <StatCard
            label="Utilisateurs inscrits"
            value={stats?.totalUsers}
            trend={stats?.newUsersThisMonth ?? 0}
            trendLabel={`+${stats?.newUsersThisMonth ?? 0} ce mois-ci`}
            icon={Users}
            color="green"
            loading={loading}
          />
          <StatCard
            label="Actifs ce mois"
            value={stats?.activeUsersThisMonth}
            trend={stats ? Math.round((stats.activeUsersThisMonth / (stats.totalUsers || 1)) * 100) : 0}
            trendLabel={stats ? `${Math.round((stats.activeUsersThisMonth / (stats.totalUsers || 1)) * 100)}% du total` : '—'}
            icon={Users}
            color="blue"
            loading={loading}
          />
          <StatCard
            label="Défis complétés"
            value={stats?.totalCompletedQuests}
            trend={stats?.completedQuestsThisMonth ?? 0}
            trendLabel={`+${stats?.completedQuestsThisMonth ?? 0} ce mois-ci`}
            icon={Swords}
            color="purple"
            loading={loading}
          />
          <StatCard
            label="Tokens push actifs"
            value={stats?.pushTokens}
            trend={stats ? Math.round((stats.pushTokens / (stats.totalUsers || 1)) * 100) : 0}
            trendLabel={stats ? `${Math.round((stats.pushTokens / (stats.totalUsers || 1)) * 100)}% d'adoption` : '—'}
            icon={Bell}
            color="orange"
            loading={loading}
          />
        </div>

        {/* Activity chart + Donut */}
        <div className="dashboard-grid">
          <div className="chart-card">
            <div className="chart-card-header">
              <h3 className="chart-card-title">
                Activité de la plateforme
                {!loading && (
                  <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 8 }}>
                    {activityData.reduce((a, c) => a + c.transactions, 0)} transactions · {activityData.reduce((a, c) => a + c.newUsers, 0)} inscriptions
                  </span>
                )}
              </h3>
              <select
                className="select-pill"
                value={activityDays}
                onChange={e => setActivityDays(Number(e.target.value))}
              >
                <option value={7}>7 derniers jours</option>
                <option value={14}>14 derniers jours</option>
                <option value={30}>30 derniers jours</option>
              </select>
            </div>
            {loading ? (
              <div className="loading-overlay" style={{ minHeight: 260 }}>
                <div className="loading-spinner" />
                <span>Chargement des données…</span>
              </div>
            ) : activityData.every(d => d.transactions === 0 && d.newUsers === 0) ? (
              <div className="empty-state" style={{ minHeight: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontSize: 14 }}>Aucune activité sur cette période.</p>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>Les données apparaîtront dès que des utilisateurs seront actifs.</p>
              </div>
            ) : (
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activityData}>
                    <defs>
                      <linearGradient id="gradTx" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ea580c" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="transactions" name="transactions" stroke="#ea580c" strokeWidth={2.5} fillOpacity={1} fill="url(#gradTx)" />
                    <Area type="monotone" dataKey="newUsers" name="newUsers" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#gradUsers)" strokeDasharray="4 2" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Donut */}
          <div className="donut-card">
            <div className="chart-card-header">
              <h3 className="chart-card-title">Répartition Quêtes</h3>
            </div>
            {loading ? (
              <div className="loading-overlay" style={{ minHeight: 180 }}>
                <div className="loading-spinner" />
              </div>
            ) : donutData.length === 0 ? (
              <div className="empty-state">Aucune quête enregistrée.</div>
            ) : (
              <>
                <div className="donut-chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="50%" innerRadius={52} outerRadius={72} paddingAngle={3} dataKey="value">
                        {donutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="donut-center-text">
                    <div className="donut-center-value">{totalQuests}</div>
                    <div className="donut-center-label">Quêtes</div>
                  </div>
                </div>
                <div className="donut-legend">
                  {donutData.map((item, i) => (
                    <div key={item.name} className="donut-legend-item">
                      <div className="donut-legend-label">
                        <span className="donut-legend-dot" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                        <span>{item.name}</span>
                      </div>
                      <div className="donut-legend-value">{item.value}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Recent users table */}
        <div className="bottom-grid">
          <div className="table-card">
            <div className="table-card-header">
              <h3 className="table-card-title">Derniers utilisateurs inscrits</h3>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {stats?.totalUsers ?? '—'} au total
              </span>
            </div>
            {loading ? (
              <div className="loading-overlay" style={{ minHeight: 180 }}>
                <div className="loading-spinner" />
                <span>Chargement…</span>
              </div>
            ) : recentUsers.length === 0 ? (
              <div className="empty-state">Aucun utilisateur enregistré.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Email</th>
                      <th>Inscription</th>
                      <th>Push</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentUsers.map((u) => (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 700 }}>{u.name}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{new Date(u.createdAt).toLocaleDateString('fr-FR')}</td>
                        <td>
                          <span className={`status-pill ${u.hasPushToken ? 'completed' : 'progress'}`} style={{ fontSize: 11, backgroundColor: u.hasPushToken ? '#d1fae5' : '#f1f5f9', color: u.hasPushToken ? '#059669' : '#94a3b8' }}>
                            {u.hasPushToken ? '✓ Actif' : '— Inactif'}
                          </span>
                        </td>
                        <td>
                          <span className={`status-pill ${u.suspended ? 'canceled' : 'completed'}`} style={{ fontSize: 11 }}>
                            {u.suspended ? 'Suspendu' : 'Actif'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* XP & Quest summary */}
          <div className="list-card">
            <div className="list-card-header">
              <h3 className="chart-card-title">Métriques Quêtes</h3>
            </div>
            {loading ? (
              <div className="loading-overlay" style={{ minHeight: 150 }}>
                <div className="loading-spinner" />
              </div>
            ) : (
              <>
                <div className="info-row">
                  <span className="info-row-label">XP total distribué</span>
                  <span className="info-row-value" style={{ color: 'var(--accent)', fontWeight: 800 }}>
                    {(stats?.totalXp ?? 0).toLocaleString('fr-FR')} XP
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-row-label">Taux de complétion</span>
                  <span className="info-row-value">{questStats?.completionRate ?? 0} %</span>
                </div>
                <div className="info-row">
                  <span className="info-row-label">Générées par Rixy IA</span>
                  <span className="info-row-value">{questStats?.aiVsStatic?.ai ?? 0}</span>
                </div>
                <div className="info-row">
                  <span className="info-row-label">Statiques (fallback)</span>
                  <span className="info-row-value">{questStats?.aiVsStatic?.static ?? 0}</span>
                </div>
                <div className="info-row">
                  <span className="info-row-label">Actives en ce moment</span>
                  <span className="status-pill progress" style={{ fontSize: 11 }}>
                    {stats?.activeQuests ?? 0} quêtes
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-row-label">Expirées</span>
                  <span className="status-pill canceled" style={{ fontSize: 11 }}>
                    {stats?.expiredQuests ?? 0} quêtes
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
