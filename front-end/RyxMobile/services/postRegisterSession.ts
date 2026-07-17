import * as SecureStore from 'expo-secure-store';

const CREDENTIALS_KEY = 'ryx_post_register_creds_v1';

/**
 * Identifiants saisis à l’inscription, conservés temporairement de façon sécurisée
 * pendant le parcours d'onboarding jusqu’à l’écran de bienvenue (connexion automatique).
 */
export async function setPostRegisterCredentials(phoneE164: string, password: string): Promise<void> {
  try {
    const data = JSON.stringify({ phoneE164: phoneE164.trim(), password });
    await SecureStore.setItemAsync(CREDENTIALS_KEY, data);
  } catch {
    /* ignore */
  }
}

export async function consumePostRegisterCredentials(): Promise<{ phoneE164: string; password: string } | null> {
  try {
    const data = await SecureStore.getItemAsync(CREDENTIALS_KEY);
    if (!data) return null;
    await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function clearPostRegisterCredentials(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
  } catch {
    /* ignore */
  }
}
