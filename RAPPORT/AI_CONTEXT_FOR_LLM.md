<!-- Généré par scripts/export-ai-project-context.sh — ne pas éditer à la main ; régénérer après gros changements -->

# Contexte projet **Ryx** (pour assistant IA)

Ce document résume le dépôt **Ryx** : application mobile (Expo), API Node/Express/MongoDB, et microservice Python (IA). Aucun secret n’est inclus ; les vraies clés restent dans les `.env` (non versionnés).

## 1. Architecture (vue d’ensemble)

| Couche | Dossier | Stack | Rôle |
|--------|---------|-------|------|
| Mobile | `front-end/RyxMobile/` | Expo ~55, React Native 0.83, expo-router, TypeScript | App utilisateur : auth, dépenses, boutique, profil, chatbot assistant |
| API | `back-end/` | Express 5, Mongoose 9, MongoDB | REST sous préfixe `/api/*` |
| IA | `service-ai/` | FastAPI, Uvicorn, Google Gemini (`google-generativeai`), PyMongo optionnel | `POST /chat`, `POST /api/quests/generate`, contexte financier utilisateur si `MONGO_URI` |

**Flux typique :** l’app mobile appelle le back-end (`EXPO_PUBLIC_API_URL`). Le chatbot peut appeler le service IA (`EXPO_PUBLIC_AI_SERVICE_URL` ou dérivation LAN + port).

**Ancien dossier** `front-end/` (hors `RyxMobile`) : squelette React Native CLI minimal ; l’app active est **RyxMobile**.

---

## 2. Back-end Node (`back-end/`)

- **Entrée :** `servers.js` (script npm `start`).
- **Base :** `config/db.js` + variables d’environnement (Mongo, port, etc. — voir `.env` local).
- **Préfixe API :** tout passe par `/api/...` sauf `/` et `/api/health`.

### Routes Express (montées dans `servers.js`)
```
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/balance', balanceRoutes);
app.use('/api/monthly-balance', balanceRoutes);
app.use('/api/users', userRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/quests', questRoutes);
app.use('/api/projects', projectRoutes);
```

### Fichiers serveur notables

- `routes/auth.js`, `controllers/auth/authController.js` — authentification
- `routes/users.js`, `controllers/userController.js` — utilisateurs, profil, suppression compte, mot de passe
- `routes/transactions.js`, `controllers/transactionController.js` — transactions
- `routes/expenses.js`, `controllers/expensesController.js` — dépenses (métier)
- `routes/balance.js`, `controllers/balanceController.js` — soldes / monthly balance
- `routes/dashboard.js`, `controllers/dashboardController.js` — tableau de bord
- `routes/recurring.js`, `controllers/recurringController.js` — règles récurrentes
- `routes/shop.js`, `controllers/shopController.js` — boutique (produits, commandes)
- `models/*.js` — schémas Mongoose (`User`, `Transaction`, `Wallet`, `Product`, `ShopOrder`, etc.)
- `controllers/whatsappOtpController.js`, `services/whatsappOtpSend.js` — OTP WhatsApp (inscription)
- `routes/quests.js`, `controllers/questController.js` — défis RyxQuest (génération IA / règles de secours, cooldown)

---

## 3. Mobile Expo (`front-end/RyxMobile/`)

- **Router :** `expo-router` — fichiers sous `app/`.
- **Onglets :** `app/(tabs)/` (navigation principale).
- **Écrans :** `app/screen/*` (dépenses, accueil, paramètres, boutique, chatbot, profil, etc.).
- **Auth :** `app/auth/*` (login, register, OTP, onboarding).
- **Clients HTTP :** `services/*.ts` (`auth.ts`, `expenses.ts`, `dashboard.ts`, `shop.ts`, `chatbot.ts`, `quests.ts`, …).
- **Thème / i18n :** `theme`, `locales/strings.ts`, hooks `useTranslation`, `useAppTheme`.

### Variables d’environnement (public Expo)

Voir `front-end/RyxMobile/.env.example` : `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_AI_SERVICE_URL` / `EXPO_PUBLIC_AI_PORT`, `EXPO_PUBLIC_AI_CONTEXT_SECRET` (si secret côté service IA).

**Important device réel :** `localhost` / `127.0.0.1` sur le téléphone ≠ le Mac ; utiliser l’IP LAN du Mac pour API et service IA.

---

## 4. Service IA Python (`service-ai/`)

- **Entrée :** `main.py` (FastAPI `app`).
- **Dépendances :** `requirements.txt` (FastAPI, Uvicorn, python-dotenv, google-generativeai, pymongo).
- **Contexte Mongo :** `mongo_context.py` — si `MONGO_URI` est défini et `user_mongo_id` ou `userId` envoyé, enrichit le prompt avec données Ryx (sans mot de passe).
- **Doc détaillée :** `service-ai/README.md`.
- **Lancement dev réseau local :** `uvicorn main:app --reload --host 0.0.0.0 --port 8081` (ou autre port, aligné avec `.env` mobile).

---

## 5. Inventaire de fichiers source (extrait)

Liste tronquée (~400 chemins max), sans `node_modules`, `venv`, `.git`, builds natifs.
```

```

### package.json back-end (`back-end/package.json`)
```
{
  "name": "back-end",
  "version": "1.0.0",
  "main": "index.js",
  "keywords": [],
  "author": "",
  "license": "ISC",
  "description": "",
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
  "scripts": {
    "start": "node servers.js",
    "test": "jest",
    "migrate:currency-xof": "node scripts/migrate-currency-to-xof.js",
    "migrate:currency-xof:dry-run": "node scripts/migrate-currency-to-xof.js --dry-run"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "mongodb-memory-server": "^11.1.0",
    "supertest": "^7.2.2"
  }
}
```
### package.json RyxMobile (`front-end/RyxMobile/package.json`)
```
{
  "name": "ryxmobile",
  "main": "expo-router/entry",
  "version": "1.0.0",
  "scripts": {
    "start": "expo start",
    "start:lan": "expo start --lan",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "ios:clean": "expo prebuild --clean --platform ios && expo run:ios",
    "web": "expo start --web",
    "test": "jest",
    "postinstall": "patch-package"
  },
  "dependencies": {
    "@formatjs/intl-displaynames": "^7.3.1",
    "@formatjs/intl-locale": "^5.3.1",
    "@react-native-async-storage/async-storage": "2.2.0",
    "@react-native-community/datetimepicker": "8.6.0",
    "expo": "~55.0.0",
    "expo-constants": "~55.0.7",
    "expo-font": "~55.0.4",
    "expo-image-picker": "~55.0.14",
    "expo-linear-gradient": "~55.0.8",
    "expo-linking": "~55.0.9",
    "expo-localization": "~55.0.9",
    "expo-print": "~55.0.15",
    "expo-router": "~55.0.4",
    "expo-secure-store": "~15.0.7",
    "expo-sharing": "~55.0.20",
    "expo-splash-screen": "~55.0.10",
    "expo-status-bar": "~55.0.4",
    "expo-symbols": "^56.0.6",
    "expo-web-browser": "~55.0.9",
    "libphonenumber-js": "^1.12.41",
    "react": "19.2.0",
    "react-dom": "19.2.0",
    "react-native": "0.83.2",
    "react-native-safe-area-context": "~5.6.0",
    "react-native-screens": "~4.23.0",
    "react-native-svg": "^15.15.3",
    "react-native-web": "~0.21.0"
  },
  "devDependencies": {
    "@testing-library/jest-native": "^5.4.3",
    "@testing-library/react-native": "^13.3.3",
    "@types/react": "~19.2.0",
    "jest": "^29.7.0",
    "jest-expo": "^55.0.18",
    "patch-package": "^8.0.0",
    "react-test-renderer": "^19.2.0",
    "typescript": "~5.9.2"
  },
  "private": true
}
```
### requirements.txt service-ai (`service-ai/requirements.txt`)
```
# Python 3.11 ou 3.12 uniquement (3.14 : protobuf / google-generativeai incompatibles).
fastapi==0.111.0
uvicorn[standard]==0.27.0
python-dotenv==1.0.1
google-generativeai>=0.8.3,<0.9
protobuf>=5.29.0,<6
pymongo==4.13.0
```
### .env.example back-end (sans secrets) (`back-end/.env.example`)
```
# Base MongoDB locale (le serveur MongoDB doit être démarré).
MONGO_URI=mongodb://localhost:27017/ryxdb
PORT=3000

# Production (Render)
# NODE_ENV=production
# JWT_SECRET=… (openssl rand -hex 32)

# ── OTP par e-mail (EmailJS — recommandé sur Render, sans domaine) ───────────
# 1. Compte https://www.emailjs.com/ → Email Service (Gmail, etc.)
# 2. Template avec « To email » = {{to_email}} et corps : code {{otp_code}}
# 3. Account → Security : activer « Allow non-browser API » + « Use Private Key »
# 4. Account → API Keys : Public Key + Private Key (obligatoire si « Use Private Key » activé)
# 5. Account → Security : « Allow API for non-browser applications » = ON
EMAILJS_SERVICE_ID=service_xxxxxxxx
EMAILJS_TEMPLATE_ID=template_xxxxxxxx
EMAILJS_PUBLIC_KEY=xxxxxxxxxxxxxxxx
EMAILJS_PRIVATE_KEY=xxxxxxxxxxxxxxxx
# EMAILJS_DEBUG=true  # sur Render : renvoie detail dans la 502 (diagnostic)

# WHATSAPP_MOCK=false quand EmailJS est configuré (sinon l’e-mail est ignoré).
WHATSAPP_MOCK=false

# Mot de passe oublié : POST /api/auth/forgot-password/send|verify|reset (OTP par e-mail, même template EmailJS).

# ── WhatsApp OTP (optionnel, si WHATSAPP_MOCK=false et pas d’e-mail à l’inscription)
# META_WHATSAPP_ACCESS_TOKEN=
# META_WHATSAPP_PHONE_NUMBER_ID=
# META_WHATSAPP_OTP_TEMPLATE_NAME=ryx_otp
# META_WHATSAPP_TEMPLATE_LANG=fr

# ── Secours dev sans EmailJS ─────────────────────────────────────────────────
# WHATSAPP_MOCK=true → code OTP dans les logs + devOtp (tests uniquement)

# SMTP local (Gmail) — fonctionne en local, souvent bloqué sur Render
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=ton@gmail.com
# SMTP_PASS=mot_de_passe_application
# EMAIL_FROM=Ryx <ton@gmail.com>

# Resend (optionnel, domaine vérifié requis)
# RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
```
### .env.example service-ai (sans secrets) (`service-ai/.env.example`)
```
# Clé depuis https://aistudio.google.com/app/apikey
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Modèle principal (les alias courts type gemini-1.5-flash peuvent renvoyer 404 selon l'API).
# Défaut : gemini-2.5-flash. Le serveur essaie ensuite gemini-flash-latest, gemini-2.0-flash, etc.
GEMINI_MODEL=gemini-2.5-flash

# Optionnel : inséré en 2e position dans la chaîne d'essais.
# GEMINI_MODEL_FALLBACK=gemini-flash-latest

# OBLIGATOIRE pour les chiffres personnalisés (même valeur que back-end/.env).
MONGO_URI=mongodb://localhost:27017/ryxdb
# Optionnel si l’URI n’a pas de nom de base :
# MONGO_DB_NAME=ryxdb

# Optionnel mais recommandé si le service IA est joignable hors localhost : même valeur que EXPO_PUBLIC_AI_CONTEXT_SECRET côté app.
# RYX_AI_SERVICE_SECRET=change-moi-en-production

# CORS (optionnel). Si défini, seules ces origines seront autorisées (séparées par des virgules).
# AI_CORS_ORIGINS=http://localhost:19006,http://localhost:8081

# Rate limiting (optionnel). Valeurs par défaut: 30 requêtes / 10 minutes / IP sur POST /chat.
# AI_RATE_LIMIT_CHAT_MAX=30
# AI_RATE_LIMIT_CHAT_WINDOW_S=600

PORT=8082
```
### .env.example mobile (sans secrets) (`front-end/RyxMobile/.env.example`)
```
# URL du back-end en développement (obligatoire avec Expo Go).
# Copie ce fichier en .env et remplace par l'IP de ton Mac (PAS 192.168.1.1 = routeur).
# Trouve ton IP : Terminal → ifconfig | grep "inet " (prends le 192.168.x.x, pas .1.1)
# Puis redémarre Metro : npx expo start -c

# Origine seule (sans /api à la fin) : http://IP:PORT — sinon doublon /api/api/... → 404.
EXPO_PUBLIC_API_URL=http://192.168.1.19:3000

# Port du service IA (défaut 8081). À mettre si tu lances uvicorn sur un autre port (ex. 8082).
# EXPO_PUBLIC_AI_PORT=8082

# Optionnel : URL complète du service IA (prioritaire sur EXPO_PUBLIC_AI_PORT).
# EXPO_PUBLIC_AI_SERVICE_URL=http://192.168.1.19:8082

# Si service-ai a RYX_AI_SERVICE_SECRET dans .env, mets la même valeur ici (sinon 401 sur /chat).
# EXPO_PUBLIC_AI_CONTEXT_SECRET=change-moi-en-production

# Optionnel : timeout des requêtes vers le back Node (ms), défaut 20000 — évite chargement infini si mauvaise IP.
# EXPO_PUBLIC_API_FETCH_TIMEOUT_MS=25000

# Optionnel : délai max (ms) pour POST /chat — Gemini + Mongo peut dépasser ~60s (défaut app : 120000).
# EXPO_PUBLIC_AI_CHAT_TIMEOUT_MS=180000
```
---

## 6. Conventions pour travailler sur ce dépôt

- **Mobile :** préférer `front-end/RyxMobile/` ; respecter les patterns existants (services, `useAppTheme`, clés i18n).
- **API :** réponses JSON ; erreurs côté client souvent via `Error` / messages renvoyés par l’API.
- **IA :** ne jamais committer `GEMINI_API_KEY` ; le service refuse de démarrer sans clé.
- **Régénérer ce document :** à la racine du dépôt, `./scripts/export-ai-project-context.sh`.

## 7. Sécurité / paramètres importants (rappel)

### CORS

- API Node: `CORS_ORIGINS` (CSV) — si vide, permissif en dev.
- Service IA: `AI_CORS_ORIGINS` (CSV) — si vide, permissif en dev.

### Rate limiting

- API Node:
  - OTP: `RATE_LIMIT_OTP_WINDOW_MS`, `RATE_LIMIT_OTP_MAX`
  - Auth: `RATE_LIMIT_AUTH_WINDOW_MS`, `RATE_LIMIT_AUTH_MAX`
- Service IA: `AI_RATE_LIMIT_CHAT_MAX`, `AI_RATE_LIMIT_CHAT_WINDOW_S` (par IP sur `POST /chat` et `POST /api/quests/generate`)
