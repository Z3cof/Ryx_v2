/**
 * Identifiants saisis à l’inscription, conservés en mémoire le temps du parcours
 * jusqu’à l’écran de bienvenue (connexion automatique vers l’accueil).
 * Jamais persisté sur disque.
 */
let pending: { email: string; password: string } | null = null;

export function setPostRegisterCredentials(email: string, password: string): void {
  pending = { email: email.trim(), password };
}

export function consumePostRegisterCredentials(): { email: string; password: string } | null {
  const p = pending;
  pending = null;
  return p;
}

export function clearPostRegisterCredentials(): void {
  pending = null;
}
