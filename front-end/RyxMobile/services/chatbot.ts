/**
 * Assistant Ryx — appelle le service IA (Gemini via service-ai) si configuré,
 * sinon réponses locales (règles + locales/strings).
 */

import type { ResolvedLocale } from '../contexts/LocaleContext';
import {
  AI_CHAT_TIMEOUT_MS,
  AI_SERVICE_BASE_URL,
  AI_SERVICE_CONTEXT_SECRET,
} from '../config/api';
import { getAssistantStrings } from '../locales/strings';

export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: number;
};

export type SendChatOptions = {
  /** Messages déjà affichés avant l’envoi (sans le message utilisateur courant). */
  history: ChatMessage[];
  userName?: string;
  /** `_id` Mongo de l’utilisateur connecté — contexte finances si le service-ai a MONGO_URI. */
  userMongoId?: string;
};

function isGreeting(s: string): boolean {
  const g =
    /bonjour|salut|coucou|hello|hi\b|hey\b|good\s*(morning|afternoon|evening)|howdy/i;
  return g.test(s);
}

function mentionsExpense(s: string): boolean {
  return /dépense|depense|expense|bill|purchase|achat|spend/i.test(s);
}

function mentionsBudget(s: string): boolean {
  return /budget|solde|balance|économie|economie|saving/i.test(s);
}

function mentionsQuest(s: string): boolean {
  return /quest|défi|defi|gamification|rixy|xp|niveau|level|streak/i.test(s);
}

function mentionsHelp(s: string): boolean {
  return /aide|help|how|comment|what|pourquoi|why|\?/.test(s);
}

function mentionsFinances(s: string): boolean {
  return /finances?|budget|solde|balance|mois|month|dépense|depense|entrée|entree|épargne|epargne/i.test(
    s
  );
}

function mentionsPurchaseAdvice(s: string): boolean {
  return /voiture|véhicule|vehicule|acheter|achat|investir|me permettre|afford|conseil|avis/i.test(s);
}

function buildAssistantReply(userText: string, locale: ResolvedLocale): string {
  const s = getAssistantStrings(locale);
  const raw = userText.toLowerCase().trim();
  if (!raw) {
    return s.replyEmpty;
  }
  if (isGreeting(userText)) {
    return s.replyGreeting;
  }
  if (mentionsExpense(userText)) {
    return s.replyExpense;
  }
  if (mentionsBudget(userText)) {
    return s.replyBudget;
  }
  if (mentionsQuest(userText)) {
    return s.replyQuest;
  }
  if (mentionsHelp(userText)) {
    return s.replyHelp;
  }
  if (mentionsFinances(userText)) {
    return locale === 'en'
      ? 'Connect to the AI service (service-ai + EXPO_PUBLIC_API_URL) for a personalized analysis of your real numbers. Meanwhile: check Home for this month’s totals and Expenses for details.'
      : 'Connecte le service IA (service-ai + EXPO_PUBLIC_API_URL) pour une analyse avec tes vrais chiffres. En attendant : onglet Accueil pour le mois et Dépenses pour le détail.';
  }
  if (mentionsPurchaseAdvice(userText)) {
    return locale === 'en'
      ? 'For purchase advice (car, etc.), enable the AI assistant with your account connected — I’ll use your income, spending cap, and recurring costs to suggest realistic options.'
      : 'Pour un conseil d’achat (voiture, etc.), active l’assistant IA avec ton compte connecté — j’utiliserai tes entrées, ton plafond et tes récurrents pour proposer des options réalistes.';
  }
  return s.replyFallback;
}

async function fetchGeminiReply(
  userText: string,
  locale: ResolvedLocale,
  options: SendChatOptions
): Promise<string> {
  const base = AI_SERVICE_BASE_URL;
  if (!base) {
    throw new Error('Service IA non configuré');
  }

  const messages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [];

  // Même règle que le back : ne pas envoyer un historique qui commence par assistant (message d'accueil).
  let hist = [...options.history];
  while (hist.length > 0 && hist[0].role === 'assistant') {
    hist = hist.slice(1);
  }

  for (const m of hist) {
    const t = m.text.trim();
    if (!t) continue;
    messages.push({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: t,
    });
  }

  messages.push({ role: 'user', content: userText.trim() });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (AI_SERVICE_CONTEXT_SECRET) {
    headers['X-Ryx-Ai-Secret'] = AI_SERVICE_CONTEXT_SECRET;
  }

  const body: Record<string, unknown> = {
    locale: locale === 'en' ? 'en' : 'fr',
    user_name: options.userName?.trim() || undefined,
    messages,
  };
  const mid = options.userMongoId?.trim();
  if (mid) {
    body.user_mongo_id = mid;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_CHAT_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${base}/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const name = e instanceof Error ? e.name : '';
    const looksLikeTimeout =
      name === 'AbortError' || /timed out|timeout|aborted/i.test(msg);
    if (looksLikeTimeout) {
      throw new Error(
        locale === 'en'
          ? 'The assistant took too long (slow network or Gemini). Check Wi‑Fi, that service-ai is running on your Mac, then try again. You can raise EXPO_PUBLIC_AI_CHAT_TIMEOUT_MS in .env.'
          : 'La réponse a mis trop longtemps (réseau lent ou IA). Vérifie le Wi‑Fi, que service-ai tourne sur ton Mac, puis réessaie. Tu peux augmenter EXPO_PUBLIC_AI_CHAT_TIMEOUT_MS dans .env.'
      );
    }
    const looksUnreachable =
      /network request failed|failed to fetch|econnrefused|connection refused|could not connect/i.test(
        msg
      );
    if (looksUnreachable) {
      throw new Error(
        locale === 'en'
          ? `Cannot reach the AI service (${base}). On your Mac: cd service-ai && source venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8082`
          : `Service IA injoignable (${base}). Sur le Mac : cd service-ai && source venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8082`
      );
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }

  const text = await res.text();
  let data: { reply?: string; detail?: unknown } = {};
  try {
    data = text ? (JSON.parse(text) as typeof data) : {};
  } catch {
    /* ignore */
  }

  const formatDetail = (detail: unknown): string => {
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((item) => {
          if (item && typeof item === 'object' && 'msg' in item) {
            return String((item as { msg: unknown }).msg);
          }
          return JSON.stringify(item);
        })
        .join(' · ');
    }
    if (detail != null && typeof detail === 'object' && 'message' in detail) {
      return String((detail as { message: unknown }).message);
    }
    return '';
  };

  if (!res.ok) {
    let detail = formatDetail(data.detail) || text || res.statusText || `HTTP ${res.status}`;
    if (res.status === 404) {
      detail = `${detail} — Vérifie l’URL du service IA (port : même que uvicorn, ex. EXPO_PUBLIC_AI_PORT ou EXPO_PUBLIC_AI_SERVICE_URL).`;
    }
    throw new Error(detail);
  }

  const reply = typeof data.reply === 'string' ? data.reply.trim() : '';
  if (!reply) {
    throw new Error('Réponse IA vide');
  }

  return reply;
}

/**
 * Envoie le message utilisateur. Si `AI_SERVICE_BASE_URL` est défini, appelle le service Python ;
 * sinon règles locales (sans appel réseau).
 */
export async function sendChatMessage(
  userText: string,
  locale: ResolvedLocale = 'fr',
  options?: SendChatOptions
): Promise<string> {
  const loc = locale ?? 'fr';

  if (AI_SERVICE_BASE_URL) {
    return await fetchGeminiReply(userText, loc, {
      history: options?.history ?? [],
      userName: options?.userName,
      userMongoId: options?.userMongoId,
    });
  }

  const delay = 400 + Math.random() * 350;
  await new Promise((r) => setTimeout(r, delay));
  return buildAssistantReply(userText, loc);
}
