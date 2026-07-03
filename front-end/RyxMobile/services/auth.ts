import { API_BASE_URL, API_FETCH_TIMEOUT_MS } from '../config/api';
import { apiFetch, publicApiFetch, resolveApiUrl } from './apiFetch';
import { setAuthToken, setOnboardingToken } from './authSession';

export type User = {
  _id: string;
  name: string;
  email: string;
  /** Data URL base64 si définie côté serveur */
  avatar?: string;
  /** Pays (inscription), pour devise / affichage */
  countryIso?: string;
  /** E.164 après vérification WhatsApp */
  phoneE164?: string;
  phoneVerified?: boolean;
};

export type LoginResponse = {
  user: User;
  message: string;
  token: string;
};

export type RegisterResponse = {
  user: User;
  message: string;
  token: string;
};

/** Retourne l’URL utilisée (pour messages d’erreur). */
export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

/** Vérifie que le back-end répond (GET /api/health). */
export async function checkHealth(): Promise<boolean> {
  try {
    const res = await publicApiFetch('/api/health', { method: 'GET' });
    const text = await res.text();
    if (!text) return false;
    const data = JSON.parse(text);
    return data?.ok === true;
  } catch {
    return false;
  }
}

async function parseJsonBody<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text || text.trim() === '') {
    throw new Error(`Réponse vide (status ${res.status}).`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Réponse invalide (URL : ${API_BASE_URL})`);
  }
}

async function authJsonRequest<T>(
  path: string,
  options: { method: string; body?: string }
): Promise<T> {
  const url = resolveApiUrl(path);
  if (__DEV__) console.log('[Ryx API]', options.method, url);
  let res: Response;
  try {
    res = await apiFetch(path, {
      method: options.method,
      body: options.body,
    });
  } catch (e) {
    const isAbort =
      (e instanceof DOMException && e.name === 'AbortError') ||
      (e instanceof Error && (e.name === 'AbortError' || /aborted/i.test(e.message)));
    const msg = isAbort
      ? `Délai dépassé (${API_FETCH_TIMEOUT_MS / 1000}s) ou serveur injoignable.`
      : e instanceof Error
        ? e.message
        : 'Erreur réseau';
    if (__DEV__) console.warn('[Ryx API] Erreur réseau', msg);
    throw new Error(
      `${msg} Vérifie : 1) back-end lancé (cd back-end && npm start), 2) IP du Mac dans .env (EXPO_PUBLIC_API_URL=http://IP:3000), 3) npx expo start -c. URL : ${url}`
    );
  }
  const data = await parseJsonBody<Record<string, unknown>>(res);
  if (!res.ok) throw new Error((data.error as string) || 'Erreur');
  return data as T;
}

async function publicJsonRequest<T>(
  path: string,
  options: { method: string; body?: string }
): Promise<T> {
  const url = resolveApiUrl(path);
  if (__DEV__) console.log('[Ryx API]', options.method, url);
  let res: Response;
  try {
    res = await publicApiFetch(path, {
      method: options.method,
      body: options.body,
    });
  } catch (e) {
    const isAbort =
      (e instanceof DOMException && e.name === 'AbortError') ||
      (e instanceof Error && (e.name === 'AbortError' || /aborted/i.test(e.message)));
    const msg = isAbort
      ? `Délai dépassé (${API_FETCH_TIMEOUT_MS / 1000}s) ou serveur injoignable.`
      : e instanceof Error
        ? e.message
        : 'Erreur réseau';
    if (__DEV__) console.warn('[Ryx API] Erreur réseau', msg);
    throw new Error(
      `${msg} Vérifie : 1) back-end lancé (cd back-end && npm start), 2) IP du Mac dans .env (EXPO_PUBLIC_API_URL=http://IP:3000), 3) npx expo start -c. URL : ${url}`
    );
  }
  const data = await parseJsonBody<Record<string, unknown>>(res);
  if (!res.ok) throw new Error((data.error as string) || 'Erreur');
  return data as T;
}

export async function login(phoneE164: string, password: string): Promise<LoginResponse> {
  const data = await publicJsonRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phoneE164, password }),
  });
  if (data.token) {
    await setAuthToken(data.token);
  }
  return data;
}

export async function register(
  name: string,
  email: string,
  password: string,
  phoneE164: string,
  phoneVerificationToken: string,
  countryIso?: string
): Promise<RegisterResponse> {
  const body: Record<string, string> = {
    name,
    email,
    password,
    phoneE164,
    phoneVerificationToken,
  };
  if (countryIso?.trim()) {
    body.countryIso = countryIso.trim().toUpperCase().slice(0, 2);
  }
  const data = await publicJsonRequest<RegisterResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (data.token) {
    // Stockage en mémoire UNIQUEMENT → ne persiste pas dans SecureStore.
    // Les appels authés pendant l'onboarding (setMerchant, createRecurringRule)
    // fonctionneront via ce token, mais index.tsx ne détectera pas de session
    // active et ne court-circuitera pas le parcours d'onboarding.
    setOnboardingToken(data.token);
  }
  return data;
}

/** Utilisateur courant (nécessite un jeton valide). */
export async function fetchSessionUser(): Promise<{ user: User }> {
  return authJsonRequest<{ user: User }>('/api/auth/me', { method: 'GET' });
}

export type SendWhatsappOtpResponse = { ok: boolean; mock?: boolean; devOtp?: string };

/**
 * Avant l’OTP : numéro E.164 valide et pas déjà utilisé (`POST .../whatsapp-otp/validate-phone`).
 * En cas d’échec, l’erreur peut porter `status` (ex. 409) et `code` (ex. PHONE_TAKEN).
 */
export async function validateRegisterPhone(
  phoneE164: string
): Promise<{ ok: boolean; phoneE164: string }> {
  const res = await publicApiFetch('/api/auth/whatsapp-otp/validate-phone', {
    method: 'POST',
    body: JSON.stringify({ phoneE164 }),
  });
  const text = await res.text();
  const data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  if (!res.ok) {
    const msg = (data.error as string) || `Erreur ${res.status}`;
    const err = new Error(msg) as Error & { status: number; code?: string };
    err.status = res.status;
    if (typeof data.code === 'string') err.code = data.code;
    throw err;
  }
  return data as { ok: boolean; phoneE164: string };
}

export async function sendWhatsappOtp(
  phoneE164: string,
  opts?: { email?: string }
): Promise<SendWhatsappOtpResponse> {
  const body: Record<string, string> = { phoneE164 };
  const em = opts?.email?.trim();
  if (em) body.email = em.toLowerCase();
  const res = await publicApiFetch('/api/auth/whatsapp-otp/send', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  if (!res.ok) {
    const msg = (data.error as string) || `Erreur ${res.status}`;
    const err = new Error(msg) as Error & { status: number; code?: string };
    err.status = res.status;
    if (typeof data.code === 'string') err.code = data.code;
    throw err;
  }
  return data as SendWhatsappOtpResponse;
}

export async function verifyWhatsappOtp(
  phoneE164: string,
  code: string
): Promise<{ verificationToken: string }> {
  const res = await publicApiFetch('/api/auth/whatsapp-otp/verify', {
    method: 'POST',
    body: JSON.stringify({ phoneE164, code }),
  });
  const text = await res.text();
  const data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  if (!res.ok) {
    throw new Error((data.error as string) || `Erreur ${res.status}`);
  }
  return { verificationToken: String((data as { verificationToken?: string }).verificationToken || '') };
}

export type ForgotPasswordSendResponse = { ok: boolean; mock?: boolean; devOtp?: string; message?: string };

export async function sendForgotPasswordCode(phoneE164: string): Promise<ForgotPasswordSendResponse> {
  const res = await publicApiFetch('/api/auth/forgot-password/send', {
    method: 'POST',
    body: JSON.stringify({ phoneE164 }),
  });
  const text = await res.text();
  const data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  if (!res.ok) {
    const msg = (data.error as string) || `Erreur ${res.status}`;
    const err = new Error(msg) as Error & { status: number; code?: string; detail?: string };
    err.status = res.status;
    if (typeof data.code === 'string') err.code = data.code;
    if (typeof data.detail === 'string') err.detail = data.detail;
    throw err;
  }
  return data as ForgotPasswordSendResponse;
}

export async function verifyForgotPasswordCode(
  phoneE164: string,
  code: string
): Promise<{ resetToken: string }> {
  const res = await publicApiFetch('/api/auth/forgot-password/verify', {
    method: 'POST',
    body: JSON.stringify({ phoneE164, code }),
  });
  const text = await res.text();
  const data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  if (!res.ok) {
    throw new Error((data.error as string) || `Erreur ${res.status}`);
  }
  return { resetToken: String((data as { resetToken?: string }).resetToken || '') };
}

export async function resetPasswordWithToken(
  phoneE164: string,
  resetToken: string,
  newPassword: string
): Promise<{ message: string }> {
  const data = await publicJsonRequest<{ message: string }>('/api/auth/forgot-password/reset', {
    method: 'POST',
    body: JSON.stringify({
      phoneE164,
      resetToken,
      newPassword,
    }),
  });
  return data;
}



export type UpdateProfilePayload = {
  name?: string;
  email?: string;
  /** Data URL ou `null` pour supprimer la photo */
  avatar?: string | null;
};

/** Met à jour nom et/ou email (champs optionnels, au moins un requis côté client). */
export async function updateUserProfile(
  userId: string,
  payload: UpdateProfilePayload
): Promise<{ user: User }> {
  return authJsonRequest<{ user: User }>(`/api/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/** Change le numéro WhatsApp (OTP requis, même jeton que l’inscription). */
export async function updateUserPhone(
  userId: string,
  phoneE164: string,
  phoneVerificationToken: string
): Promise<{ user: User }> {
  return authJsonRequest<{ user: User }>(
    `/api/users/${encodeURIComponent(userId)}/phone`,
    {
      method: 'PATCH',
      body: JSON.stringify({ phoneE164, phoneVerificationToken }),
    }
  );
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ message: string }> {
  return authJsonRequest<{ message: string }>(
    `/api/users/${encodeURIComponent(userId)}/password`,
    {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    }
  );
}

/** Supprime le compte et les données associées (mot de passe requis côté API). */
export async function deleteAccount(userId: string, password: string): Promise<{ message: string }> {
  return authJsonRequest<{ message: string }>(`/api/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  });
}

/**
 * Enregistre le token push Expo sur le backend pour activer les notifications.
 * Silencieux en cas d'erreur (ne bloque pas l'utilisateur).
 */
export async function savePushToken(pushToken: string): Promise<void> {
  try {
    await apiFetch('/api/notifications/register-token', {
      method: 'POST',
      body: JSON.stringify({ pushToken }),
    });
  } catch (err) {
    if (__DEV__) console.warn('[Ryx Push] Impossible d\'enregistrer le push token:', err);
  }
}

/**
 * Supprime le token push Expo du backend pour désactiver les notifications.
 * Silencieux en cas d'erreur.
 */
export async function removePushToken(): Promise<void> {
  try {
    await apiFetch('/api/notifications/unregister-token', {
      method: 'DELETE',
    });
  } catch (err) {
    if (__DEV__) console.warn('[Ryx Push] Impossible de supprimer le push token:', err);
  }
}
