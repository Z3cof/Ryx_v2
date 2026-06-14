import { apiFetch } from './apiFetch';

export type Quest = {
  _id: string;
  userId: string;
  title: string;
  description: string;
  type: 'save_amount' | 'limit_category' | 'log_expenses' | 'first_action';
  targetCategory?: string;
  targetValue: number;
  currentValue: number;
  xpReward: number;
  difficulty: 'easy' | 'medium' | 'hard';
  icon: string;
  status: 'active' | 'completed' | 'failed';
  generatedByAi: boolean;
  expiresAt?: string | null;
  completedAt?: string | null;
};

export type UserQuestProgress = {
  xp: number;
  totalQuestsCompleted: number;
  streakDays: number;
  bestStreak: number;
  level: {
    name: string;
    minXp: number;
    maxXp: number | null;
  };
};

export type FetchQuestsResponse = {
  quests: Quest[];
  recentCompleted: Quest[];
  progress: UserQuestProgress;
};

export type GenerateQuestsResponse = {
  generated: number;
  quests?: Quest[];
  message: string;
};

export type CompleteQuestResponse = {
  quest: Quest;
  xpEarned: number;
  progress: UserQuestProgress;
  message: string;
};

export async function fetchQuests(userId: string): Promise<FetchQuestsResponse> {
  const res = await apiFetch(`/api/quests/${encodeURIComponent(userId)}`, { method: 'GET' });
  const text = await res.text();
  if (!res.ok) {
    const data = text ? JSON.parse(text) : {};
    throw new Error((data as { error?: string }).error || `Erreur ${res.status}`);
  }
  return JSON.parse(text || '{}');
}

export async function fetchProgress(userId: string): Promise<UserQuestProgress> {
  const res = await apiFetch(`/api/quests/${encodeURIComponent(userId)}/progress`, { method: 'GET' });
  const text = await res.text();
  if (!res.ok) {
    const data = text ? JSON.parse(text) : {};
    throw new Error((data as { error?: string }).error || `Erreur ${res.status}`);
  }
  return JSON.parse(text || '{}');
}

export async function generateQuests(userId: string): Promise<GenerateQuestsResponse> {
  const res = await apiFetch(`/api/quests/${encodeURIComponent(userId)}/generate`, {
    method: 'POST',
  });
  const text = await res.text();
  if (!res.ok) {
    const data = text ? JSON.parse(text) : {};
    throw new Error((data as { error?: string }).error || `Erreur ${res.status}`);
  }
  return JSON.parse(text || '{}');
}

export async function completeQuest(userId: string, questId: string): Promise<CompleteQuestResponse> {
  const res = await apiFetch(`/api/quests/${encodeURIComponent(userId)}/${encodeURIComponent(questId)}/complete`, {
    method: 'PATCH',
  });
  const text = await res.text();
  if (!res.ok) {
    const data = text ? JSON.parse(text) : {};
    throw new Error((data as { error?: string }).error || `Erreur ${res.status}`);
  }
  return JSON.parse(text || '{}');
}
