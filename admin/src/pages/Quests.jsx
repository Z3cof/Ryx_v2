import React, { useState, useEffect } from 'react';
import { Swords, Award, TrendingUp, Sparkles } from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import { api } from '../config/api';
import TopBar from '../components/TopBar';
import StatCard from '../components/StatCard';

const STATUS_COLORS = {
  active: '#3b82f6',
  completed: '#10b981',
  expired: '#f59e0b',
  abandoned: '#ef4444',
};

export default function Quests() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.quests()
      .then(setStats)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Préparer les données pour le donut de statuts
  const statusData = stats ? Object.entries(stats.statusBreakdown || {})
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({
      name: { active: 'Actives', completed: 'Complétées', expired: 'Expirées', abandoned: 'Abandonnées' }[k] || k,
      value: v,
      color: STATUS_COLORS[k] || '#94a3b8',
    })) : [];

  const totalQuests = statusData.reduce((a, c) => a + c.value, 0);

  // Données IA vs statique pour barchart
  const aiBarData = stats ? [
    { name: 'IA (Rixy)', value: stats.aiVsStatic?.ai ?? 0, fill: '#ea580c' },
    { name: 'Statique', value: stats.aiVsStatic?.static ?? 0, fill: '#3b82f6' },
  ] : [];

  return (
    <div className="page-enter" style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <TopBar title="RyxQuest — défis" subtitle="Statistiques de réussite et répartition des quêtes" />

      {error && <div className="field-error" style={{ margin: '0 32px 16px' }}>{error}</div>}

      <div className="page">
        {/* KPIs */}
        <div className="stats-grid">
          <StatCard
            label="Taux de complétion"
            value={stats ? `${stats.completionRate} %` : '—'}
            trend={stats?.completionRate ?? 0}
            trendLabel="des défis réussis"
            icon={TrendingUp}
            color="green"
            loading={loading}
          />
          <StatCard
            label="XP total distribué"
            value={stats?.totalXpDistributed ?? 0}
            icon={Award}
            color="purple"
            loading={loading}
          />
          <StatCard
            label="Défis complétés"
            value={stats?.totalQuestsCompleted ?? 0}
            icon={Swords}
            color="blue"
            loading={loading}
          />
        </div>

        <div className="dashboard-grid">
          {/* Donut statuts */}
          <div className="donut-card" style={{ minHeight: 'auto' }}>
            <div className="chart-card-header">
              <h3 className="chart-card-title">Répartition par statut</h3>
            </div>
            {loading ? (
              <div className="loading-overlay" style={{ minHeight: 200 }}>
                <div className="loading-spinner" />
              </div>
            ) : statusData.length === 0 ? (
              <div className="empty-state">Aucune quête enregistrée.</div>
            ) : (
              <>
                <div className="donut-chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%" cy="50%"
                        innerRadius={52} outerRadius={72}
                        paddingAngle={3} dataKey="value"
                      >
                        {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="donut-center-text">
                    <div className="donut-center-value">{totalQuests}</div>
                    <div className="donut-center-label">Quêtes</div>
                  </div>
                </div>
                <div className="donut-legend">
                  {statusData.map(d => (
                    <div key={d.name} className="donut-legend-item">
                      <div className="donut-legend-label">
                        <span className="donut-legend-dot" style={{ backgroundColor: d.color }} />
                        <span>{d.name}</span>
                      </div>
                      <div className="donut-legend-value">{d.value}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* IA vs Statique bar */}
          <div className="chart-card">
            <div className="chart-card-header">
              <h3 className="chart-card-title">IA Rixy vs Statique</h3>
            </div>
            {loading ? (
              <div className="loading-overlay" style={{ minHeight: 200 }}>
                <div className="loading-spinner" />
              </div>
            ) : (
              <>
                <div style={{ height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={aiBarData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        formatter={(val) => [val, 'Quêtes']}
                        contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={64}>
                        {aiBarData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="donut-legend" style={{ marginTop: 12 }}>
                  <div className="info-row">
                    <span className="info-row-label">Part IA</span>
                    <span className="info-row-value" style={{ color: '#ea580c', fontWeight: 800 }}>
                      {stats ? Math.round(((stats.aiVsStatic?.ai ?? 0) / ((stats.aiVsStatic?.ai ?? 0) + (stats.aiVsStatic?.static ?? 0) || 1)) * 100) : 0} %
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-row-label">Quêtes IA</span>
                    <span className="info-row-value">{stats?.aiVsStatic?.ai ?? 0}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-row-label">Quêtes statiques</span>
                    <span className="info-row-value">{stats?.aiVsStatic?.static ?? 0}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
