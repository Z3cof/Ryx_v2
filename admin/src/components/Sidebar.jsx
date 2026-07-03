import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, BarChart3, Swords, Bot, Bell, Shield, Settings,
  ChevronLeft, ChevronRight, ChevronDown
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/users', icon: Users, label: 'Utilisateurs' },
  { to: '/platform', icon: BarChart3, label: 'Plateforme' },
  { to: '/quests', icon: Swords, label: 'RyxQuest' },
  { to: '/rixy', icon: Bot, label: 'Rixy IA' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/security', icon: Shield, label: 'Sécurité' },
  { to: '/settings', icon: Settings, label: 'Paramètres' },
];

export default function Sidebar({ collapsed, onToggle, onLogout }) {
  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      {/* Logo Section */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">R</div>
        <div className="sidebar-logo-text">
          <div className="sidebar-logo-title">Ryx Admin</div>
          <div className="sidebar-logo-sub">Tableau de bord</div>
        </div>
        <button className="sidebar-collapse-btn" onClick={onToggle} title={collapsed ? 'Développer' : 'Réduire'}>
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Nav List */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={collapsed ? label : undefined}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon size={18} className="nav-icon" />
            <span className="nav-label">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Profile Footer */}
      <div className="sidebar-profile" onClick={onLogout} style={{ cursor: 'pointer' }} title="Cliquer pour vous déconnecter">
        <div className="sidebar-profile-avatar">A</div>
        <div className="sidebar-profile-info">
          <span className="sidebar-profile-name">Admin Ryx</span>
          <span className="sidebar-profile-email">admin@ryx.com</span>
        </div>
        <ChevronDown size={14} className="sidebar-profile-chevron" />
      </div>
    </aside>
  );
}
