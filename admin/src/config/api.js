const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function getAdminSecret() {
  return sessionStorage.getItem('ryx_admin_secret') || '';
}

export function setAdminSecret(secret) {
  sessionStorage.setItem('ryx_admin_secret', secret);
}

export function clearAdminSecret() {
  sessionStorage.removeItem('ryx_admin_secret');
}

async function adminFetch(path, options = {}) {
  const secret = getAdminSecret();
  const res = await fetch(`${API_BASE}${path}`, {
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
    throw new Error('Session expirée');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
  return data;
}

export const api = {
  stats: () => adminFetch('/api/admin/stats'),
  users: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return adminFetch(`/api/admin/users${qs ? '?' + qs : ''}`);
  },
  suspendUser: (id) => adminFetch(`/api/admin/users/${id}/suspend`, { method: 'PATCH' }),
  deleteUser: (id) => adminFetch(`/api/admin/users/${id}`, { method: 'DELETE' }),
  platform: () => adminFetch('/api/admin/platform'),
  quests: () => adminFetch('/api/admin/quests'),
  notificationStats: () => adminFetch('/api/admin/notifications/stats'),
  sendGlobalNotification: (payload) => adminFetch('/api/admin/notifications/send-global', { method: 'POST', body: JSON.stringify(payload) }),
  security: () => adminFetch('/api/admin/security'),
  activity: (days = 14) => adminFetch(`/api/admin/activity?days=${days}`),
  rixyStats: () => adminFetch('/api/admin/rixy/stats'),
  recentUsers: (limit = 5) => adminFetch(`/api/admin/recent-users?limit=${limit}`),
};

