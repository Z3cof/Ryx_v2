import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Tu testes sur téléphone réel (Expo Go) ?
 * → Mets ici l’IP de ton PC (même Wi‑Fi). Ex: 'http://192.168.1.15:5000'
 * → Trouve ton IP : Mac/Linux `ifconfig`, Windows `ipconfig`
 *
 * Pour forcer une URL : décommente la ligne FORCE_IP et mets ton IP (Terminal : ifconfig | grep "inet ").
 */
const DEV_PORT = 3000;

/** Port du service Python `service-ai` (Gemini) en dev. Surcharge : EXPO_PUBLIC_AI_PORT. Défaut 8082 (aligné docker-compose + service-ai/.env.example). */
const DEV_AI_PORT = (() => {
  const raw = process.env.EXPO_PUBLIC_AI_PORT?.trim();
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 8082;
})();

/** Si "impossible de joindre le serveur" : mets l’IP de ton Mac ici (Terminal : ifconfig | grep "inet ") */
const FALLBACK_DEV_URL = 'http://192.168.1.5:3000';

/** 192.168.1.1 = routeur → on ignore pour éviter les erreurs réseau */
const ROUTER_IP = '192.168.1.1';

function isLoopbackUrl(urlString: string): boolean {
  try {
    const u = new URL(urlString);
    return u.hostname === '127.0.0.1' || u.hostname === 'localhost';
  } catch {
    return /127\.0\.0\.1|localhost/i.test(urlString);
  }
}

/** Ryx : les routes sont `/api/...` depuis la racine du serveur — l’origine ne doit pas finir par `/api`. */
function normalizeApiOrigin(url: string): string {
  let u = url.trim().replace(/\/+$/, '');
  if (/\/api$/i.test(u)) {
    u = u.replace(/\/api$/i, '').replace(/\/+$/, '');
  }
  return u;
}

function getApiBaseUrl(): string {
  if (!__DEV__) {
    const prodUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
    return normalizeApiOrigin(prodUrl && prodUrl.length > 0 ? prodUrl : 'https://ryx-v2.onrender.com');
  }

  // En dev : localhost par defaut (simulateur). Pour telephone reel, mets EXPO_PUBLIC_USE_LAN=true dans .env
  const useLan = process.env.EXPO_PUBLIC_USE_LAN === 'true';
  if (!useLan) {
    if (Platform.OS === 'android') return `http://10.0.2.2:${DEV_PORT}`;
    return `http://127.0.0.1:${DEV_PORT}`;
  }

  // Telephone reel (Expo Go) : .env EXPO_PUBLIC_API_URL avec l'IP du Mac
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv && fromEnv.trim()) {
    const url = normalizeApiOrigin(fromEnv);
    if (!url.includes(ROUTER_IP)) return url;
  }
  return normalizeApiOrigin(FALLBACK_DEV_URL);
}

export const API_BASE_URL = getApiBaseUrl();

/**
 * URL du service IA (FastAPI / Gemini dans `service-ai/`).
 * - Développement : même logique que l’API (localhost / 10.0.2.2 / IP LAN sur le port 8081 par défaut,
 *   ou `EXPO_PUBLIC_AI_PORT`), ou `EXPO_PUBLIC_AI_SERVICE_URL` pour forcer l’URL complète.
 * - Production : uniquement si `EXPO_PUBLIC_AI_SERVICE_URL` est défini ; sinon null (chatbot en mode règles locales).
 */
function getAiServiceBaseUrl(): string | null {
  const forced = process.env.EXPO_PUBLIC_AI_SERVICE_URL?.trim();
  const useLan = process.env.EXPO_PUBLIC_USE_LAN === 'true';
  if (forced) {
    // Sur téléphone, 127.0.0.1 = l’appareil, pas le Mac → on dérive l’IP depuis EXPO_PUBLIC_API_URL.
    const ignoreLoopbackOnDevice =
      __DEV__ && Constants.isDevice && useLan && isLoopbackUrl(forced);
    if (!ignoreLoopbackOnDevice) {
      return forced.replace(/\/$/, '');
    }
  }

  if (!__DEV__) {
    return null;
  }

  if (!useLan) {
    if (Platform.OS === 'android') return `http://10.0.2.2:${DEV_AI_PORT}`;
    return `http://127.0.0.1:${DEV_AI_PORT}`;
  }

  const fromApi = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromApi) {
    try {
      const u = new URL(fromApi);
      u.port = String(DEV_AI_PORT);
      return u.origin;
    } catch {
      /* ignore */
    }
  }

  try {
    const u = new URL(FALLBACK_DEV_URL);
    u.port = String(DEV_AI_PORT);
    return u.origin;
  } catch {
    return `http://192.168.1.5:${DEV_AI_PORT}`;
  }
}

export const AI_SERVICE_BASE_URL = getAiServiceBaseUrl();

/** Si le service IA exige RYX_AI_SERVICE_SECRET, même valeur dans EXPO_PUBLIC_AI_CONTEXT_SECRET. */
export const AI_SERVICE_CONTEXT_SECRET =
  process.env.EXPO_PUBLIC_AI_CONTEXT_SECRET?.trim() || '';

/**
 * Délai max pour POST `/chat` (Gemini + contexte Mongo peut dépasser ~60s sur certains appareils).
 * Surcharge : `EXPO_PUBLIC_AI_CHAT_TIMEOUT_MS` (15000–600000).
 */
export const AI_CHAT_TIMEOUT_MS = (() => {
  const raw = process.env.EXPO_PUBLIC_AI_CHAT_TIMEOUT_MS?.trim();
  const n = raw ? parseInt(raw, 10) : NaN;
  if (Number.isFinite(n) && n >= 15_000 && n <= 600_000) {
    return n;
  }
  return 120_000;
})();

/** Timeout par défaut pour `apiFetch` / `publicApiFetch` (évite spinner infini si IP ou serveur faux). Surcharge : EXPO_PUBLIC_API_FETCH_TIMEOUT_MS (5000–120000). */
export const API_FETCH_TIMEOUT_MS = (() => {
  const raw = process.env.EXPO_PUBLIC_API_FETCH_TIMEOUT_MS?.trim();
  const n = raw ? parseInt(raw, 10) : NaN;
  if (Number.isFinite(n) && n >= 5_000 && n <= 120_000) {
    return n;
  }
  return 20_000;
})();

if (__DEV__) {
  console.log('[Ryx] API utilisée :', API_BASE_URL, '(appareil réel :', Constants.isDevice + ')');
  if (AI_SERVICE_BASE_URL) {
    console.log('[Ryx] Service IA :', AI_SERVICE_BASE_URL);
  }
}
