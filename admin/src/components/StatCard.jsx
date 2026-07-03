import React from 'react';

export default function StatCard({ label, value, trend, trendLabel, icon: Icon, color = 'green', loading }) {
  const formatted = typeof value === 'number' ? value.toLocaleString('fr-FR') : (value ?? '—');

  return (
    <div className={`stat-card ${color}`}>
      <div className="stat-card-top">
        <div className="stat-card-label">{label}</div>
        <div className="stat-card-icon">
          {Icon && <Icon size={18} />}
        </div>
      </div>

      {loading ? (
        <div style={{ height: 36, background: 'var(--border-light)', borderRadius: 8, animation: 'pulse 1.5s infinite', margin: '8px 0' }} />
      ) : (
        <div className="stat-card-value">{formatted}</div>
      )}

      {trendLabel && (
        <div className={`stat-card-trend ${trend >= 0 ? 'up' : 'neutral'}`}>
          <span>{trend >= 0 ? '↑' : '↓'}</span>
          <span>{trendLabel}</span>
        </div>
      )}
    </div>
  );
}
