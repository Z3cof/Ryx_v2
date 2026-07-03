import React, { useState, useEffect } from 'react';
import { Bell, Sparkles, Send, CheckCircle } from 'lucide-react';
import { api } from '../config/api';
import TopBar from '../components/TopBar';
import StatCard from '../components/StatCard';

export default function Notifications() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchStats = () => {
    setLoading(true);
    api.notificationStats()
      .then(setStats)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    setSending(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await api.sendGlobalNotification({ title, body });
      setSuccessMsg(res.message);
      setTitle('');
      setBody('');
      fetchStats();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="page-enter" style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <TopBar title="Notifications push" subtitle="Gestion des tokens push et diffusion globale" />

      {error && <div className="field-error" style={{ margin: '0 32px 16px' }}>{error}</div>}
      {successMsg && (
        <div style={{ margin: '0 32px 16px', padding: 12, backgroundColor: 'var(--accent-light)', color: 'var(--accent-dark)', borderRadius: 8, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle size={16} />
          {successMsg}
        </div>
      )}

      <div className="page">
        <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <StatCard
            label="Tokens push actifs"
            value={stats?.usersWithPushToken ?? 0}
            trend={stats?.adoptionRate ?? 0}
            trendLabel="Taux d'adoption"
            icon={Bell}
            color="green"
            loading={loading}
          />
          <StatCard
            label="Sans token push"
            value={stats?.usersWithoutPushToken ?? 0}
            icon={Bell}
            color="orange"
            loading={loading}
          />
        </div>

        <div className="sections-grid" style={{ gridTemplateColumns: '1fr' }}>
          <div className="section-card">
            <div className="section-card-header">
              <Send size={18} style={{ color: 'var(--accent)' }} />
              <div className="section-card-title">Diffuser une notification globale</div>
            </div>
            <div className="section-card-body">
              <form onSubmit={handleSend}>
                <div className="field">
                  <label>Titre de la notification</label>
                  <input
                    type="text"
                    placeholder="Ex: 📢 Maintenance planifiée"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label>Corps du message</label>
                  <input
                    type="text"
                    placeholder="Ex: Ryx sera indisponible ce soir de 22h à 23h pour mise à jour..."
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={sending || !title.trim() || !body.trim()}
                >
                  <Send size={14} />
                  <span>{sending ? 'Envoi en cours...' : 'Diffuser à tous les terminaux'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
