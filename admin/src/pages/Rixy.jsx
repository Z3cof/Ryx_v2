import React, { useState, useEffect } from 'react';
import { Bot, Cpu, TrendingUp, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell
} from 'recharts';
import { api } from '../config/api';
import TopBar from '../components/TopBar';
import StatCard from '../components/StatCard';

export default function Rixy() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = () => {
    setLoading(true);
    api.rixyStats()
      .then(setStats)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStats(); }, []);

  return (
    <div className="page-enter" style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <TopBar title="Rixy — assistant IA" subtitle="Métriques des quêtes générées par Gemini" />

      {error && <div className="field-error" style={{ margin: '0 32px 16px' }}>{error}</div>}

      <div className="page">

        {/* KPIs */}
        <div className="stats-grid">
          <StatCard
            label="Quêtes IA générées"
            value={stats?.totalAiQuests ?? 0}
            trend={stats?.growthVsLastMonth ?? 0}
            trendLabel={stats?.growthVsLastMonth != null ? `${stats.growthVsLastMonth > 0 ? '+' : ''}${stats.growthVsLastMonth}% vs mois dernier` : 'Ce mois-ci'}
            icon={Bot}
            color="green"
            loading={loading}
          />
          <StatCard
            label="Taux de succès IA"
            value={stats ? `${stats.aiSuccessRate} %` : '—'}
            trend={stats?.aiSuccessRate ?? 0}
            trendLabel="des quêtes IA complétées"
            icon={TrendingUp}
            color="blue"
            loading={loading}
          />
          <StatCard
            label="Part IA vs Statique"
            value={stats ? `${stats.aiRatio} %` : '—'}
            trend={stats?.aiRatio ?? 0}
            trendLabel="de toutes les quêtes"
            icon={Sparkles}
            color="purple"
            loading={loading}
          />
        </div>

        <div className="sections-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>

          {/* Breakdown par difficulté */}
          <div className="section-card">
            <div className="section-card-header">
              <Cpu size={18} style={{ color: 'var(--accent)' }} />
              <div>
                <div className="section-card-title">Répartition par difficulté</div>
                <div className="section-card-sub">Quêtes générées par Rixy IA</div>
              </div>
            </div>
            <div className="section-card-body">
              {loading ? (
                <div className="loading-overlay" style={{ minHeight: 180 }}><div className="loading-spinner" /></div>
              ) : !stats?.difficultyBreakdown?.length ? (
                <div className="empty-state">Aucune donnée disponible.</div>
              ) : (
                <>
                  <div style={{ height: 160, marginBottom: 16 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.difficultyBreakdown} layout="vertical" margin={{ left: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                        <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} width={70} />
                        <Tooltip />
                        <Bar dataKey="count" name="Quêtes" radius={[0, 4, 4, 0]}>
                          {stats.difficultyBreakdown.map((_, i) => (
                            <Cell key={i} fill={['#ea580c', '#3b82f6', '#10b981', '#8b5cf6'][i % 4]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {stats.difficultyBreakdown.map(d => (
                    <div key={d.name} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600 }}>{d.name}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{d.count} quêtes</span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${Math.min(100, (d.count / (stats.difficultyBreakdown[0]?.count || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Stats détaillées */}
          <div className="section-card">
            <div className="section-card-header">
              <AlertCircle size={18} style={{ color: 'var(--accent)' }} />
              <div>
                <div className="section-card-title">Détails et comparatif</div>
                <div className="section-card-sub">IA Rixy (Gemini) vs Système statique</div>
              </div>
            </div>
            <div className="section-card-body">
              {loading ? (
                <div className="loading-overlay" style={{ minHeight: 180 }}><div className="loading-spinner" /></div>
              ) : (
                <>
                  <div className="info-row">
                    <span className="info-row-label">Quêtes IA ce mois</span>
                    <span className="info-row-value">{stats?.aiQuestsThisMonth ?? 0}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-row-label">Quêtes IA mois dernier</span>
                    <span className="info-row-value">{stats?.aiQuestsLastMonth ?? 0}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-row-label">Quêtes IA complétées</span>
                    <span className="status-pill completed" style={{ fontSize: 11 }}>{stats?.aiQuestsCompleted ?? 0}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-row-label">Quêtes statiques (fallback)</span>
                    <span className="info-row-value">{stats?.totalStaticQuests ?? 0}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-row-label">Part IA dans le total</span>
                    <span className="info-row-value" style={{ color: 'var(--purple)', fontWeight: 800, fontSize: 16 }}>
                      {stats?.aiRatio ?? 0} %
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-row-label">Taux de réussite IA</span>
                    <span className="info-row-value" style={{ color: 'var(--accent)', fontWeight: 800, fontSize: 16 }}>
                      {stats?.aiSuccessRate ?? 0} %
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
