import React from 'react';
import { Search, Bell } from 'lucide-react';

export default function TopBar({ title, subtitle }) {
  return (
    <header className="topbar">
      <div>
        <h1 className="topbar-title">{title}</h1>
        {subtitle && <div className="topbar-subtitle">{subtitle}</div>}
      </div>
      <div className="topbar-right">
        {/* Barre de recherche pillule */}
        <div className="header-search">
          <Search size={16} style={{ color: 'var(--text-tertiary)' }} />
          <input type="text" placeholder="Rechercher..." />
        </div>

        {/* Bouton cloche avec badge */}
        <button className="bell-btn" title="Notifications">
          <Bell size={18} />
          <span className="bell-badge" />
        </button>
      </div>
    </header>
  );
}
