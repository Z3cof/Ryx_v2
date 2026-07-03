import React, { useState, useEffect } from 'react';
import { BarChart2, Wallet, FileText, CheckCircle2, Users } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, PieChart, Pie
} from 'recharts';
import { api } from '../config/api';
import TopBar from '../components/TopBar';
import StatCard from '../components/StatCard';

const COLORS = ['#ea580c', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

export default function Platform() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.platform()
      .then(setStats)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const activeRatio = stats
    ? Math.round((stats.activeUsers / ((stats.activeUsers + stats.inactiveUsers) || 1)) * 100)
    : 0;

  const pieData = stats
    ? [
        { name: 'Actifs', value: stats.activeUsers || 0 },
        { name: 'Inactifs', value: stats.inactiveUsers || 0 },
      ].filter(d => d.value > 0)
    : [];

  return (
    <div className="page-enter" style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <TopBar title="Activité de la Plateforme" subtitle="Statistiques anonymisées et agrégées" />

      {error && <div className="field-error" style={{ margin: '0 32px 16px' }}>{error}</div>}

      <div className="page">
        {/* KPIs */}
        <div className="stats-grid">
          <StatCard
            label="Transactions créées"
            value={stats?.totalTransactions ?? 0}
            trend={stats?.transactionsThisMonth ?? 0}
            trendLabel={`+${stats?.transactionsThisMonth ?? 0} ce mois`}
            icon={FileText}
            color="blue"
            loading={loading}
          />
          <StatCard
            label="Budgets mensuels"
            value={stats?.totalBudgets ?? 0}
            icon={Wallet}
            color="purple"
            loading={loading}
          />
          <StatCard
            label="Utilisateurs actifs"
            value={stats?.activeUsers ?? 0}
            trend={activeRatio}
            trendLabel={`${activeRatio}% du total`}
            icon={CheckCircle2}
            color="green"
            loading={loading}
          />
          <StatCard
            label="Utilisateurs inactifs"
            value={stats?.inactiveUsers ?? 0}
            icon={Users}
            color="orange"
            loading={loading}
          />
        </div>

        {/* Charts grid */}
        <div className="dashboard-grid">
          {/* Bar chart — Top catégories */}
          <div className="chart-card">
            <div className="chart-card-header">
              <h3 className="chart-card-title">
                Top catégories de dépenses
                {!loading && stats?.topCategories?.length > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 8 }}>
                    {stats.topCategories.reduce((a, c) => a + c.count, 0)} transactions
                  </span>
                )}
              </h3>
            </div>
            {loading ? (
              <div className="loading-overlay" style={{ minHeight: 260 }}>
                <div className="loading-spinner" />
                <span>Chargement…</span>
              </div>
            ) : !stats?.topCategories?.length ? (
              <div className="empty-state" style={{ minHeight: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <p>Aucune transaction enregistrée.</p>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>Les données apparaîtront dès que des utilisateurs créeront des transactions.</p>
              </div>
            ) : (
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.topCategories} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      formatter={(val) => [val, 'Transactions']}
                      contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                    />
                    <Bar dataKey="count" name="Transactions" radius={[4, 4, 0, 0]} maxBarSize={48}>
                      {stats.topCategories.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Donut — répartition actifs/inactifs */}
          <div className="donut-card">
            <div className="chart-card-header">
              <h3 className="chart-card-title">Utilisateurs actifs ce mois</h3>
            </div>
            {loading ? (
              <div className="loading-overlay" style={{ minHeight: 180 }}>
                <div className="loading-spinner" />
              </div>
            ) : (
              <>
                <div className="donut-chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData.length ? pieData : [{ name: 'Aucun', value: 1 }]}
                        cx="50%" cy="50%"
                        innerRadius={52} outerRadius={72}
                        paddingAngle={pieData.length > 1 ? 3 : 0}
                        dataKey="value"
                        startAngle={90} endAngle={-270}
                      >
                        {(pieData.length ? pieData : [{ name: 'Aucun', value: 1 }]).map((_, i) => (
                          <Cell key={i} fill={pieData.length ? [COLORS[2], '#e2e8f0'][i] : '#e2e8f0'} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="donut-center-text">
                    <div className="donut-center-value">{activeRatio}%</div>
                    <div className="donut-center-label">Actifs</div>
                  </div>
                </div>
                <div className="donut-legend">
                  <div className="donut-legend-item">
                    <div className="donut-legend-label">
                      <span className="donut-legend-dot" style={{ backgroundColor: COLORS[2] }} />
                      <span>Actifs ce mois</span>
                    </div>
                    <div className="donut-legend-value">{stats?.activeUsers ?? 0}</div>
                  </div>
                  <div className="donut-legend-item">
                    <div className="donut-legend-label">
                      <span className="donut-legend-dot" style={{ backgroundColor: '#e2e8f0' }} />
                      <span>Inactifs</span>
                    </div>
                    <div className="donut-legend-value">{stats?.inactiveUsers ?? 0}</div>
                  </div>
                  <div className="donut-legend-item" style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-light)' }}>
                    <div className="donut-legend-label" style={{ fontWeight: 700 }}>Total</div>
                    <div className="donut-legend-value">{(stats?.activeUsers ?? 0) + (stats?.inactiveUsers ?? 0)}</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Progress bars table — catégories détaillées */}
        {!loading && stats?.topCategories?.length > 0 && (
          <div className="section-card" style={{ marginTop: 0 }}>
            <div className="section-card-header">
              <BarChart2 size={18} style={{ color: 'var(--accent)' }} />
              <div>
                <div className="section-card-title">Détail des catégories</div>
                <div className="section-card-sub">Part de chaque catégorie sur le total des transactions</div>
              </div>
            </div>
            <div className="section-card-body">
              {stats.topCategories.map((c, i) => {
                const pct = Math.min(100, Math.round((c.count / (stats.topCategories[0]?.count || 1)) * 100));
                return (
                  <div key={c.name} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[i % COLORS.length], display: 'inline-block' }} />
                        {c.name}
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}>{c.count} transactions</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, ${COLORS[i % COLORS.length]}, ${COLORS[(i + 1) % COLORS.length]})`
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
