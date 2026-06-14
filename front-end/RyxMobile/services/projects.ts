import { apiFetch } from './apiFetch';

export type ProjectGoal = {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  progressPercent: number;
  autoEnabled: boolean;
  autoAmount: number;
  autoCadence?: 'day' | 'week' | 'month';
  currency?: string;
  createdAt?: string | null;
};

export async function fetchProjects(userId: string): Promise<ProjectGoal[]> {
  const res = await apiFetch(`/api/projects/${encodeURIComponent(userId)}`, { method: 'GET' });
  const text = await res.text();
  if (!res.ok) {
    const data = text ? JSON.parse(text) : {};
    throw new Error((data as { error?: string }).error || `Erreur ${res.status}`);
  }
  const data = JSON.parse(text || '{}') as { projects?: ProjectGoal[] };
  return data.projects ?? [];
}

export async function createProjectGoal(
  userId: string,
  payload: {
    title: string;
    targetAmount: number;
    autoEnabled?: boolean;
    autoAmount?: number;
    autoCadence?: 'day' | 'week' | 'month';
    currency?: string;
  }
): Promise<ProjectGoal> {
  const res = await apiFetch(`/api/projects/${encodeURIComponent(userId)}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    const data = text ? JSON.parse(text) : {};
    throw new Error((data as { error?: string }).error || `Erreur ${res.status}`);
  }
  const data = JSON.parse(text || '{}') as { project?: ProjectGoal };
  if (!data.project) throw new Error('Réponse serveur invalide (project manquant).');
  return data.project;
}

export async function contributeProjectGoal(userId: string, projectId: string, amount: number): Promise<ProjectGoal> {
  const res = await apiFetch(
    `/api/projects/${encodeURIComponent(userId)}/${encodeURIComponent(projectId)}/contribute`,
    {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }
  );
  const text = await res.text();
  if (!res.ok) {
    const data = text ? JSON.parse(text) : {};
    throw new Error((data as { error?: string }).error || `Erreur ${res.status}`);
  }
  const data = JSON.parse(text || '{}') as { project?: ProjectGoal };
  if (!data.project) throw new Error('Réponse serveur invalide (project manquant).');
  return data.project;
}

export async function applyAutoFillProjectGoal(userId: string, projectId: string): Promise<ProjectGoal> {
  const res = await apiFetch(
    `/api/projects/${encodeURIComponent(userId)}/${encodeURIComponent(projectId)}/auto-fill`,
    { method: 'POST' }
  );
  const text = await res.text();
  if (!res.ok) {
    const data = text ? JSON.parse(text) : {};
    throw new Error((data as { error?: string }).error || `Erreur ${res.status}`);
  }
  const data = JSON.parse(text || '{}') as { project?: ProjectGoal };
  if (!data.project) throw new Error('Réponse serveur invalide (project manquant).');
  return data.project;
}

export async function patchProjectGoal(
  userId: string,
  projectId: string,
  payload: {
    title?: string;
    targetAmount?: number;
    autoEnabled?: boolean;
    autoAmount?: number;
    autoCadence?: 'day' | 'week' | 'month';
  }
): Promise<ProjectGoal> {
  const res = await apiFetch(`/api/projects/${encodeURIComponent(userId)}/${encodeURIComponent(projectId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    const data = text ? JSON.parse(text) : {};
    throw new Error((data as { error?: string }).error || `Erreur ${res.status}`);
  }
  const data = JSON.parse(text || '{}') as { project?: ProjectGoal };
  if (!data.project) throw new Error('Réponse serveur invalide (project manquant).');
  return data.project;
}

export async function deleteProjectGoal(userId: string, projectId: string): Promise<void> {
  const res = await apiFetch(`/api/projects/${encodeURIComponent(userId)}/${encodeURIComponent(projectId)}`, {
    method: 'DELETE',
  });
  const text = await res.text();
  if (!res.ok) {
    const data = text ? JSON.parse(text) : {};
    throw new Error((data as { error?: string }).error || `Erreur ${res.status}`);
  }
}
