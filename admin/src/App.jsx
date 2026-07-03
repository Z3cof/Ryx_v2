import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import {
  getAdminSecret, setAdminSecret, clearAdminSecret, isLoggedIn, verifyAdminSecret
} from './config/api';
import Sidebar from './components/Sidebar';
import Overview from './pages/Overview';
import Users from './pages/Users';
import Platform from './pages/Platform';
import Quests from './pages/Quests';
import Rixy from './pages/Rixy';
import Notifications from './pages/Notifications';
import Security from './pages/Security';
import SettingsPage from './pages/Settings';

// ─── Login Page ───────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const devSecret = import.meta.env.VITE_ADMIN_SECRET || '';
  const [inputSecret, setInputSecret] = useState(devSecret);
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    const key = inputSecret.trim();
    if (!key) return;

    setLoading(true);
    setError('');
    try {
      await verifyAdminSecret(key);   // Appel réel au backend
      setAdminSecret(key);
      onLogin(key);
    } catch (err) {
      setError(err.message || 'Clé invalide ou backend inaccessible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">R</div>
          <div>
            <h2 className="login-title">Ryx Admin</h2>
            <div className="login-sub">Panneau de gestion sécurisé</div>
          </div>
        </div>

        {devSecret && (
          <div style={{
            background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8,
            padding: '10px 14px', fontSize: 12, color: '#166534', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Shield size={14} />
            <span>Mode développement — clé pré-remplie depuis <code>.env</code></span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="field">
            <label>Clé d'administration (ADMIN_SECRET)</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showSecret ? 'text' : 'password'}
                placeholder="ryx_admin_xxxxxxxxxxxxxxxx"
                value={inputSecret}
                onChange={e => setInputSecret(e.target.value)}
                style={{ paddingRight: 44 }}
                required
                autoFocus={!devSecret}
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
                }}
              >
                {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="field-error" style={{ marginBottom: 14, padding: '8px 12px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>
              ⚠️ {error}
            </div>
          )}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
                Vérification en cours…
              </span>
            ) : (
              'Se connecter au Dashboard'
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 20 }}>
          La clé est définie dans <code style={{ fontSize: 11 }}>back-end/.env</code> → <code style={{ fontSize: 11 }}>ADMIN_SECRET</code>
        </p>
      </div>
    </div>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────────────
export default function App() {
  const [authenticated, setAuthenticated] = useState(isLoggedIn());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (key) => {
    setAuthenticated(true);
  };

  const handleLogout = () => {
    clearAdminSecret();
    setAuthenticated(false);
    navigate('/');
  };

  if (!authenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="app-shell">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onLogout={handleLogout}
      />
      <main className={`main${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
        <Routes>
          <Route path="/"              element={<Overview />}     />
          <Route path="/users"         element={<Users />}        />
          <Route path="/platform"      element={<Platform />}     />
          <Route path="/quests"        element={<Quests />}       />
          <Route path="/rixy"          element={<Rixy />}         />
          <Route path="/notifications" element={<Notifications />}/>
          <Route path="/security"      element={<Security />}     />
          <Route path="/settings"      element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}
