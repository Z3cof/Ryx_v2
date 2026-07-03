import React, { useState, useEffect } from 'react';
import { Search, ShieldAlert, Trash2 } from 'lucide-react';
import { api } from '../config/api';
import TopBar from '../components/TopBar';

export default function Users() {
  const [data, setData] = useState({ users: [], total: 0, page: 1, pages: 1 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkedRows, setCheckedRows] = useState({});

  const toggleCheckbox = (id) => {
    setCheckedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const fetchUsers = () => {
    setLoading(true);
    api.users({ search, page, limit: 10 })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleSuspend = async (userId) => {
    try {
      await api.suspendUser(userId);
      fetchUsers();
    } catch (err) {
      alert(`Erreur de suspension: ${err.message}`);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Es-tu sûr de vouloir supprimer définitivement cet utilisateur ?')) return;
    try {
      await api.deleteUser(userId);
      fetchUsers();
    } catch (err) {
      alert(`Erreur de suppression: ${err.message}`);
    }
  };

  return (
    <div className="page-enter" style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <TopBar title="Gestion des Utilisateurs" subtitle="Infos de compte uniquement — pas de données financières" />

      {error && <div className="field-error" style={{ margin: '0 32px 16px' }}>{error}</div>}

      <div className="page">
        <div className="table-container">
          <div className="table-header">
            <h3 className="table-title">Membres inscrits ({data.total})</h3>
            <form onSubmit={handleSearch} className="search-input">
              <Search size={16} style={{ color: 'var(--text-tertiary)' }} />
              <input
                type="text"
                placeholder="Rechercher par nom / e-mail..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </form>
          </div>

          {loading ? (
            <div className="loading-overlay">
              <div className="loading-spinner" />
              <span>Chargement des utilisateurs...</span>
            </div>
          ) : data.users.length === 0 ? (
            <div className="empty-state">
              <p>Aucun utilisateur trouvé.</p>
            </div>
          ) : (
            <>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <div className="premium-checkbox" />
                    </th>
                    <th>Nom</th>
                    <th>Email</th>
                    <th>Date d'inscription</th>
                    <th>Statut</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((user) => (
                    <tr key={user._id}>
                      <td>
                        <div
                          className={`premium-checkbox ${checkedRows[user._id] ? 'checked' : ''}`}
                          onClick={() => toggleCheckbox(user._id)}
                        />
                      </td>
                      <td style={{ fontWeight: 700 }}>{user.name}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{user.email}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{new Date(user.createdAt).toLocaleDateString('fr-FR')}</td>
                      <td>
                        <span className={`status-pill ${user.suspended ? 'canceled' : 'completed'}`} style={{ fontSize: 11 }}>
                          {user.suspended ? 'Suspendu' : 'Actif'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button
                            className={`btn btn-sm ${user.suspended ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => handleSuspend(user._id)}
                            title={user.suspended ? 'Réactiver le compte' : 'Suspendre le compte'}
                          >
                            <ShieldAlert size={14} />
                            <span>{user.suspended ? 'Réactiver' : 'Suspendre'}</span>
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(user._id)}
                            title="Supprimer définitivement"
                          >
                            <Trash2 size={14} />
                            <span>Supprimer</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {data.pages > 1 && (
                <div className="pagination">
                  <span className="pagination-info">Page {data.page} sur {data.pages}</span>
                  <button
                    className="page-btn"
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    Précédent
                  </button>
                  {[...Array(data.pages)].map((_, i) => (
                    <button
                      key={i}
                      className={`page-btn ${page === i + 1 ? 'active' : ''}`}
                      onClick={() => setPage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    className="page-btn"
                    disabled={page === data.pages}
                    onClick={() => setPage(p => Math.min(data.pages, p + 1))}
                  >
                    Suivant
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
