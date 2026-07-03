import React from 'react';

export default function SectionCard({ title, subtitle, icon: Icon, links = [], onClickLink }) {
  return (
    <div className="section-card">
      <div className="section-card-header">
        <div className="section-card-icon" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--accent)' }}>
          {Icon && <Icon size={18} />}
        </div>
        <div>
          <div className="section-card-title">{title}</div>
          <div className="section-card-sub">{subtitle}</div>
        </div>
      </div>
      <div className="section-card-body">
        <div className="section-links">
          {links.map((link) => (
            <button
              key={link}
              className="section-link"
              onClick={() => onClickLink && onClickLink(link)}
            >
              {link}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
