import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'ryx_jwt_v1';

/**
 * Token JWT conservé en mémoire UNIQUEMENT pendant l'onboarding post-inscription.
 * Il n'est JAMAIS persisté dans SecureStore, donc index.tsx ne détecte pas de
 * session active et ne court-circuite pas le parcours d'onboarding.
 * Il est effacé automatiquement dès que le login final persiste le vrai token.
 */
let _onboardingToken: string | null = null;

export function setOnboardingToken(token: string): void {
  _onboardingToken = token;
}

export function clearOnboardingToken(): void {
  _onboardingToken = null;
}

/**
 * Retourne le token persisté (session normale) OU le token d'onboarding en mémoire.
 * Utilisé par apiFetch pour les appels API authentifiés pendant l'onboarding.
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const stored = await SecureStore.getItemAsync(TOKEN_KEY);
    if (stored) return stored;
  } catch {
    /* ignore */
  }
  return _onboardingToken;
}

/**
 * Retourne uniquement le token PERSISTÉ (SecureStore).
 * Utilisé par index.tsx pour détecter une session active existante.
 * Ne retourne JAMAIS le token d'onboarding temporaire.
 */
export async function getPersistedAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setAuthToken(token: string): Promise<void> {
  _onboardingToken = null; // Le vrai login efface le token temporaire
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearAuthToken(): Promise<void> {
  _onboardingToken = null;
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await clearCachedUser();
  } catch {
    /* ignore */
  }
}

const USER_KEY = 'ryx_cached_user_v1';

export async function getCachedUser(): Promise<any | null> {
  try {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setCachedUser(user: any): Promise<void> {
  try {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  } catch {
    /* ignore */
  }
}

export async function clearCachedUser(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(USER_KEY);
  } catch {
    /* ignore */
  }
}

