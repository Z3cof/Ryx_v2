// En dev avec le proxy Vite, API_BASE = '' → les requêtes /api/** vont vers localhost:3000
// En production, mettre VITE_API_URL=https://votre-backend.onrender.com dans .env
const API_BASE = import.meta.env.VITE_API_URL || '';

export function getAdminSecret() {
  return sessionStorage.getItem('ryx_admin_secret') || '';
}

export function setAdminSecret(secret) {
  sessionStorage.setItem('ryx_admin_secret', secret);
}

export function clearAdminSecret() {
  sessionStorage.removeItem('ryx_admin_secret');
}

export function isLoggedIn() {
  return Boolean(sessionStorage.getItem('ryx_admin_secret'));
}

async function adminFetch(path, options = {}) {
  const secret = getAdminSecret();
  const url = `${API_BASE}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-secret': secret,
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    clearAdminSecret();
    window.location.href = '/';
    throw new Error('Session expirée — clé invalide ou absente.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erreur HTTP ${res.status}`);
  return data;
}

// Vérifie la clé admin en appelant un endpoint léger
export async function verifyAdminSecret(secret) {
  const res = await fetch(`${API_BASE}/api/admin/stats`, {
    headers: {
      'Content-Type': 'application/json',
      'x-admin-secret': secret,
    },
  });
  if (res.status === 401) throw new Error('Clé invalide.');
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Erreur ${res.status}`);
  }
  return true;
}

export const api = {
  stats:                  ()        => adminFetch('/api/admin/stats'),
  users:                  (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return adminFetch(`/api/admin/users${qs ? '?' + qs : ''}`);
  },
  suspendUser:            (id)      => adminFetch(`/api/admin/users/${id}/suspend`, { method: 'PATCH' }),
  deleteUser:             (id)      => adminFetch(`/api/admin/users/${id}`, { method: 'DELETE' }),
  platform:               ()        => adminFetch('/api/admin/platform'),
  quests:                 ()        => adminFetch('/api/admin/quests'),
  notificationStats:      ()        => adminFetch('/api/admin/notifications/stats'),
  sendGlobalNotification: (payload) => adminFetch('/api/admin/notifications/send-global', { method: 'POST', body: JSON.stringify(payload) }),
  security:               ()        => adminFetch('/api/admin/security'),
  activity:               (days=14) => adminFetch(`/api/admin/activity?days=${days}`),
  rixyStats:              ()        => adminFetch('/api/admin/rixy/stats'),
  recentUsers:            (n=5)     => adminFetch(`/api/admin/recent-users?limit=${n}`),
};
