# Contexte projet **Ryx** (pour assistant IA)

_Mis à jour manuellement — régénérer après gros changements._

Ce document résume le dépôt **Ryx** : application mobile (Expo), API Node/Express/MongoDB, et microservice Python (IA). Aucun secret n'est inclus ; les vraies clés restent dans les `.env` (non versionnés).

---

## 1. Architecture (vue d'ensemble)

| Couche | Dossier | Stack | Rôle |
|--------|---------|-------|------|
| Mobile | `front-end/RyxMobile/` | Expo ~55, React Native 0.83.6, expo-router, TypeScript | App utilisateur : auth, dépenses, projets, chatbot IA, notifications push |
| API | `back-end/` | Express 5, Mongoose 9, MongoDB | REST sous préfixe `/api/*`, déployé sur **Render** |
| IA | `service-ai/` | FastAPI, Uvicorn, Google Gemini (google-generativeai), PyMongo | POST /chat, POST /api/quests/generate, contexte financier utilisateur si MONGO_URI |

**Flux typique :** l'app mobile appelle le back-end (EXPO_PUBLIC_API_URL = https://ryx-v2.onrender.com). Le chatbot peut appeler le service IA (EXPO_PUBLIC_AI_SERVICE_URL = https://ryx-v2-1.onrender.com).

> Render (plan gratuit) met le back-end en veille après ~15 min d'inactivité. Le premier appel après veille peut dépasser 30–50 s. L'app mobile gère ce cas sans déconnecter l'utilisateur (session conservée en cache local via expo-secure-store).

---

## 2. Back-end Node (`back-end/`)

- **Entrée :** `servers.js` (script npm `start` → `node servers.js`).
- **Base :** `config/db.js` + variables d'environnement (Mongo, port, JWT, EmailJS…)
- **Préfixe API :** tout passe par `/api/...` sauf `/` (health check JSON) et `/api/health`.

### Routes Express montées dans `servers.js`

```
app.use('/api/auth',            authRoutes);         // login, register, OTP e-mail, mot de passe oublié
app.use('/api/dashboard',       dashboardRoutes);    // résumé financier dashboard
app.use('/api/transactions',    transactionRoutes);  // CRUD transactions
app.use('/api/expenses',        expensesRoutes);     // dépenses (catégories, résumés)
app.use('/api/balance',         balanceRoutes);      // solde + balance mensuelle
app.use('/api/monthly-balance', balanceRoutes);
app.use('/api/users',           userRoutes);         // profil, avatar, mot de passe, suppression compte
app.use('/api/recurring',       recurringRoutes);    // règles de transactions récurrentes
app.use('/api/quests',          questRoutes);        // défis RyxQuest (génération IA / règles fallback)
app.use('/api/projects',        projectRoutes);      // objectifs financiers / projets
app.use('/api/notifications',   notificationRoutes);// enregistrement/suppression token push Expo
```

> La boutique (shop.js) et les statuts vendeur/marchand (isMerchant) ont été supprimés du projet.

### Fichiers notables

| Fichier | Rôle |
|---------|------|
| `routes/auth.js` + `controllers/auth/authController.js` | Authentification JWT, OTP e-mail, mot de passe oublié |
| `routes/users.js` + `controllers/userController.js` | Profil, avatar, changement mot de passe, suppression compte |
| `routes/transactions.js` + `controllers/transactionController.js` | CRUD transactions |
| `routes/expenses.js` + `controllers/expensesController.js` | Dépenses (résumés, catégories) |
| `routes/balance.js` + `controllers/balanceController.js` | Soldes et balance mensuelle |
| `routes/dashboard.js` + `controllers/dashboardController.js` | Tableau de bord agrégé |
| `routes/recurring.js` + `controllers/recurringController.js` | Règles de récurrence |
| `routes/quests.js` + `controllers/questController.js` | RyxQuest (défis gamifiés, génération Gemini + fallback local) |
| `routes/projects.js` + `controllers/projectController.js` | Projets / objectifs d'épargne |
| `routes/notifications.js` | POST /register-token, DELETE /unregister-token — stockage token push Expo dans User.pushToken |
| `services/pushNotificationService.js` | Envoi de notifications via l'API Expo Push |
| `services/ryxNotifications.js` | Notifications métier (quêtes complétées, alertes budget, etc.) |
| `controllers/whatsappOtpController.js` + `services/whatsappOtpSend.js` | OTP e-mail à l'inscription (EmailJS) |
| `models/*.js` | Schémas Mongoose : User, Transaction, Wallet, MonthlyBalance, MonthlyBudget, RecurringRule, Quest, UserProgress, ProjectGoal, AdminSetting |
| `middleware/auth.js` | requireAuth — vérifie le JWT dans l'en-tête Authorization: Bearer ... |
| `middleware/asyncHandler.js` | Wrapper try/catch pour les controllers async |

### Modèle `User` (champs clés)

```javascript
{
  name, email, password,         // authentification
  phoneE164, phoneVerified,      // numéro WhatsApp vérifié à l'inscription
  countryIso, currency,          // pays / devise (XOF par défaut pour l'Afrique)
  avatar,                        // base64 data URL
  pushToken,                     // ExponentPushToken[...] pour les notifications push
  createdAt
}
```

---

## 3. Mobile Expo (`front-end/RyxMobile/`)

- **SDK :** Expo ~55.0.27 (SDK 55), React Native 0.83.6.
- **Router :** expo-router (~55.0.16) — fichiers sous `app/`.
- **Build cloud :** EAS Build (eas.json) — profil `preview` pour distribution interne (APK Android).

### Écrans (`app/`)

| Chemin | Description |
|--------|-------------|
| `app/index.tsx` | Splash / détection de session → redirige vers accueil ou login |
| `app/auth/login.tsx` | Connexion par numéro de téléphone + mot de passe |
| `app/auth/register.tsx` | Inscription (email + téléphone + OTP) |
| `app/auth/register-verify-otp.tsx` | Vérification OTP e-mail à l'inscription |
| `app/auth/est-vendeur.tsx` | Écran post-inscription (onboarding) |
| `app/auth/onboarding-recurring-*.tsx` | Configuration initiale des dépenses/revenus récurrents |
| `app/auth/bienvenue-inscription.tsx` | Écran de bienvenue après inscription |
| `app/auth/forgot-password.tsx` | Mot de passe oublié (OTP e-mail) |
| `app/screen/accueil.tsx` | Dashboard principal (solde, graphes, transactions récentes, quêtes) |
| `app/screen/depenses.tsx` | Gestion des dépenses et revenus |
| `app/screen/ryxquest.tsx` | Défis gamifiés RyxQuest |
| `app/screen/chatbot.tsx` | Assistant IA (Gemini via service-ai, fallback local) |
| `app/screen/parametres.tsx` | Paramètres : notifications push, langue, apparence, déconnexion, suppression compte |
| `app/screen/mes-informations.tsx` | Informations personnelles |
| `app/screen/profil-coordonnees.tsx` | Coordonnées (numéro de téléphone) |
| `app/screen/changer-mot-de-passe.tsx` | Changement de mot de passe |

### Services (`services/`)

| Fichier | Rôle |
|---------|------|
| `apiFetch.ts` | Wrapper fetch avec timeout, JWT auto-inject, gestion d'erreur réseau |
| `auth.ts` | Login, register, fetchSessionUser, savePushToken, removePushToken |
| `authSession.ts` | Gestion JWT dans expo-secure-store + cache utilisateur |
| `dashboard.ts` | Appel /api/dashboard |
| `expenses.ts` | CRUD dépenses / revenus + gestion offline via offlineStorage.ts |
| `balance.ts` | Soldes et balance mensuelle |
| `quests.ts` | Défis RyxQuest |
| `projects.ts` | Projets / objectifs d'épargne |
| `recurring.ts` | Règles de transactions récurrentes |
| `chatbot.ts` | Chat avec le service IA (Gemini) ou fallback local |
| `notifications.ts` | registerForPushNotifications() — demande permission + retourne { token, error? } |
| `offlineStorage.ts` | File d'attente locale pour les transactions hors-ligne |

### Hooks (`hooks/`)

| Fichier | Rôle |
|---------|------|
| `useAppTheme.ts` | Tokens de design (couleurs, spacing, fonts) — thème clair/sombre |
| `useTranslation.ts` | Traduction i18n (clés dans locales/strings.ts) |
| `useLocale.ts` | Langue résolue (fr / en) + préférence utilisateur |
| `usePushNotifications.ts` | Initialise les listeners de notifications, enregistre le token après login |
| `useOfflineSync.ts` | Synchronise la file d'attente offline avec le backend quand le réseau revient |

### Notifications push (fonctionnement)

1. Au chargement de `app/screen/accueil.tsx` (après login), `registerForPushNotifications()` est appelé.
2. Sur Android : demande la permission POST_NOTIFICATIONS, crée le canal `ryx-default`.
3. Retourne un objet `{ token: string | null, error?: string }`.
4. Si token obtenu → `savePushToken(token)` → `POST /api/notifications/register-token` → stocké dans User.pushToken.
5. Le back-end envoie des notifications via `services/pushNotificationService.js` (API Expo Push).

### Persistance de session

- Le JWT est stocké dans expo-secure-store via `authSession.ts`.
- À la connexion, l'utilisateur est immédiatement mis en cache locale (setCachedUser).
- Au démarrage (app/index.tsx) : si le serveur est lent (Render en veille), le token n'est jamais supprimé en cas d'erreur réseau — l'app charge le cache local et redirige vers l'accueil.

### Variables d'environnement mobile (`.env`)

```bash
# URL du back-end (production Render)
EXPO_PUBLIC_API_URL=https://ryx-v2.onrender.com

# URL du service IA (production Render)
EXPO_PUBLIC_AI_SERVICE_URL=https://ryx-v2-1.onrender.com

# Dev local : mettre l'IP LAN du Mac (PAS localhost sur téléphone réel)
# EXPO_PUBLIC_API_URL=http://192.168.x.x:3000
# EXPO_PUBLIC_USE_LAN=true

# Timeouts optionnels (ms)
# EXPO_PUBLIC_API_FETCH_TIMEOUT_MS=25000
# EXPO_PUBLIC_AI_CHAT_TIMEOUT_MS=180000
```

### Variables EAS (configurées sur expo.dev pour le profil `preview`)

- EXPO_PUBLIC_API_URL = https://ryx-v2.onrender.com
- EXPO_PUBLIC_AI_SERVICE_URL = https://ryx-v2-1.onrender.com

---

## 4. Service IA Python (`service-ai/`)

- **Entrée :** `main.py` (FastAPI app).
- **Dépendances :** `requirements.txt` (FastAPI 0.111, Uvicorn, python-dotenv, google-generativeai >=0.8, pymongo 4.13).
- **Contexte Mongo :** `mongo_context.py` — si MONGO_URI est défini et userId envoyé, enrichit le prompt avec les données financières de l'utilisateur (sans mot de passe).
- **Endpoints :** `POST /chat` (assistant Ryx), `POST /api/quests/generate` (génération de défis).
- **Lancement dev :** `uvicorn main:app --reload --host 0.0.0.0 --port 8082`

---

## 5. Dépendances clés (`package.json` actuels)

### Back-end

```json
{
  "dependencies": {
    "@emailjs/nodejs": "^5.0.2",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.6",
    "dotenv": "^17.3.1",
    "express": "^5.2.1",
    "express-rate-limit": "^8.1.0",
    "jsonwebtoken": "^9.0.3",
    "libphonenumber-js": "^1.12.41",
    "mongoose": "^9.2.4",
    "nodemailer": "^8.0.10"
  },
  "scripts": { "start": "node servers.js" }
}
```

### Mobile

```json
{
  "dependencies": {
    "@react-native-async-storage/async-storage": "2.2.0",
    "@react-native-community/netinfo": "11.5.2",
    "expo": "~55.0.27",
    "expo-device": "~55.0.18",
    "expo-notifications": "~55.0.24",
    "expo-router": "~55.0.16",
    "expo-secure-store": "~55.0.15",
    "expo-symbols": "~55.0.9",
    "react": "19.2.0",
    "react-native": "0.83.6"
  },
  "scripts": {
    "start": "expo start",
    "postinstall": "patch-package"
  }
}
```

> `patch-package` corrige un bug de résolution Metro sur Android avec `expo-symbols` (le dossier `android/` dans le build a été renommé `android_platform/`). Le patch : `front-end/RyxMobile/patches/expo-symbols+55.0.9.patch`.

---

## 6. Variables d'environnement back-end (`.env.example`)

```bash
MONGO_URI=mongodb://localhost:27017/ryxdb
PORT=3000
# JWT_SECRET=… (openssl rand -hex 32)

# OTP par e-mail (EmailJS)
EMAILJS_SERVICE_ID=service_xxxxxxxx
EMAILJS_TEMPLATE_ID=template_xxxxxxxx
EMAILJS_PUBLIC_KEY=xxxxxxxxxxxxxxxx
EMAILJS_PRIVATE_KEY=xxxxxxxxxxxxxxxx

# WHATSAPP_MOCK=false → EmailJS utilisé ; true → code OTP dans les logs (dev)
WHATSAPP_MOCK=false
```

---

## 7. Conventions et points d'attention

- **Mobile :** respecter les patterns existants : `services/*.ts`, `useAppTheme`, clés i18n dans `locales/strings.ts`, `useTranslation`.
- **API :** réponses JSON uniformes ; authentification via `requireAuth` (JWT Bearer). Toutes les routes protégées lisent `req.authUserId`.
- **IA :** ne jamais committer `GEMINI_API_KEY`.
- **Notifications push :** le token Expo (`ExponentPushToken[...]`) doit commencer par `ExponentPushToken` sinon le service de push le rejette silencieusement.
- **Render (hébergement) :** temps de démarrage à froid ~30–50 s. L'app ne déconnecte jamais l'utilisateur à cause d'un timeout réseau.
- **Devise :** XOF (franc CFA) est la devise par défaut pour les utilisateurs africains. `countryIso` détermine la devise à l'inscription.
- **Patch Metro/expo-symbols :** sur Android, Metro confond les dossiers nommés `android/` avec une extension de plateforme. Le patch renomme ce dossier en `android_platform/` dans le module expo-symbols.

### CORS

- API Node : `CORS_ORIGINS` (CSV) — si vide, permissif en dev.
- Service IA : `AI_CORS_ORIGINS` (CSV) — si vide, permissif en dev.

### Rate limiting

- API Node : OTP (RATE_LIMIT_OTP_WINDOW_MS, RATE_LIMIT_OTP_MAX), Auth (RATE_LIMIT_AUTH_WINDOW_MS, RATE_LIMIT_AUTH_MAX).
- Service IA : AI_RATE_LIMIT_CHAT_MAX / AI_RATE_LIMIT_CHAT_WINDOW_S (par IP sur POST /chat).
