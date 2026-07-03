import React, { useState, useEffect } from 'react';
import { Shield, Database, Cpu, Activity, AlertTriangle } from 'lucide-react';
import { api } from '../config/api';
import TopBar from '../components/TopBar';
import StatCard from '../components/StatCard';

export default function Security() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.security()
      .then(setStats)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-enter" style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <TopBar title="Sécurité et logs" subtitle="Santé de l'infrastructure, logs de connexion et base de données" />

      {error && <div className="field-error" style={{ margin: '0 32px 16px' }}>{error}</div>}

      <div className="page">
        <div className="stats-grid">
          <StatCard
            label="Statut MongoDB"
            value={stats?.dbStatus ?? 'connected'}
            icon={Database}
            color="green"
            loading={loading}
          />
          <StatCard
            label="Serveur Uptime"
            value={stats ? `${Math.round(stats.uptime / 60)} min` : '0 min'}
            icon={Cpu}
            color="blue"
            loading={loading}
          />
          <StatCard
            label="Tentatives échouées"
            value="0"
            icon={AlertTriangle}
            color="orange"
            loading={loading}
          />
        </div>

        <div className="sections-grid" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
          <div className="section-card">
            <div className="section-card-header">
              <Activity size={18} style={{ color: 'var(--accent)' }} />
              <div className="section-card-title">Dernières inscriptions utilisateurs</div>
            </div>
            <div className="section-card-body">
              {loading ? (
                <div className="loading-overlay" style={{ minHeight: 150 }}>
                  <div className="loading-spinner" />
                </div>
              ) : !stats?.recentSignups?.length ? (
                <div className="empty-state">Aucun utilisateur inscrit récemment.</div>
              ) : (
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Email</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentSignups.map((u, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700 }}>{u.name}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{new Date(u.createdAt).toLocaleDateString('fr-FR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="section-card">
            <div className="section-card-header">
              <Shield size={18} style={{ color: 'var(--accent)' }} />
              <div className="section-card-title">Détails Système</div>
            </div>
            <div className="section-card-body">
              {loading ? (
                <div className="loading-overlay" style={{ minHeight: 150 }}>
                  <div className="loading-spinner" />
                </div>
              ) : (
                <>
                  <div className="info-row">
                    <span className="info-row-label">Node.js Version</span>
                    <span className="info-row-value">{stats?.nodeVersion}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-row-label">Heap Utilisation</span>
                    <span className="info-row-value">
                      {stats ? `${Math.round(stats.memoryUsage?.heapUsed / 1024 / 1024)} Mo` : '—'}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-row-label">IPs suspectes bloquées</span>
                    <span className="status-pill completed">0 IP</span>
                  </div>
                  <div className="info-row">
                    <span className="info-row-label">Erreurs API 4xx/5xx</span>
                    <span className="status-pill completed">0</span>
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
