import React, { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { getAdminSecret, setAdminSecret, clearAdminSecret } from './config/api';
import Sidebar from './components/Sidebar';
import Overview from './pages/Overview';
import Users from './pages/Users';
import Platform from './pages/Platform';
import Quests from './pages/Quests';
import Rixy from './pages/Rixy';
import Notifications from './pages/Notifications';
import Security from './pages/Security';

export default function App() {
  const [secret, setSecret] = useState(getAdminSecret());
  const [inputSecret, setInputSecret] = useState('');
  const [error, setError] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (!inputSecret.trim()) return;

    // Sauvegarde en session
    setAdminSecret(inputSecret.trim());
    setSecret(inputSecret.trim());
    setError('');
  };

  const handleLogout = () => {
    clearAdminSecret();
    setSecret('');
    setInputSecret('');
    navigate('/');
  };

  if (!secret) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-logo">
            <div className="login-logo-icon">R</div>
            <div>
              <h2 className="login-title">Ryx Admin</h2>
              <div className="login-sub">Connexion sécurisée</div>
            </div>
          </div>

          <form onSubmit={handleLogin}>
            <div className="field">
              <label>Clé d'administration (ADMIN_SECRET)</label>
              <input
                type="password"
                placeholder="Entrez le secret d'administration..."
                value={inputSecret}
                onChange={e => setInputSecret(e.target.value)}
                required
              />
            </div>
            {error && <div className="field-error">{error}</div>}
            <button type="submit" className="login-btn">
              Se connecter au Dashboard
            </button>
          </form>
        </div>
      </div>
    );
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
          <Route path="/" element={<Overview />} />
          <Route path="/users" element={<Users />} />
          <Route path="/platform" element={<Platform />} />
          <Route path="/quests" element={<Quests />} />
          <Route path="/rixy" element={<Rixy />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/security" element={<Security />} />
        </Routes>
      </main>
    </div>
  );
}
