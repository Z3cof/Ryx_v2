#!/usr/bin/env bash
# Ryx — génère un document Markdown à coller dans n'importe quel chat IA
# pour lui donner une vue d'ensemble du dépôt (sans secrets).
#
# Usage:
#   ./scripts/export-ai-project-context.sh
#   ./scripts/export-ai-project-context.sh -o mon-contexte.md
#   ./scripts/export-ai-project-context.sh --stdout   # affiche seulement (pas d'écriture)
#
set -euo pipefail

OUT_DEFAULT="RAPPORT/AI_CONTEXT_FOR_LLM.md"
OUT_FILE=""
STDOUT_ONLY=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    -o|--output)
      OUT_FILE="${2:?}"
      shift 2
      ;;
    --stdout)
      STDOUT_ONLY=1
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [-o fichier.md] [--stdout]"
      exit 0
      ;;
    *)
      echo "Option inconnue: $1" >&2
      exit 1
      ;;
  esac
done

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "$OUT_FILE" && "$STDOUT_ONLY" -eq 0 ]]; then
  OUT_FILE="$ROOT/$OUT_DEFAULT"
fi

EXCLUDES=(
  -name node_modules -prune -o
  -name venv -prune -o
  -name .venv -prune -o
  -name .expo -prune -o
  -name .git -prune -o
  -name dist -prune -o
  -name web-build -prune -o
  -name build -prune -o
  -name ios -prune -o
  -name android -prune -o
)

file_tree() {
  # Éviter l’exit 141 (SIGPIPE) avec set -o pipefail quand head ferme le tube avant find.
  # IMPORTANT: prune doit cibler des *dossiers* avant -type f.
  find . \
    -type d \( \
      -name node_modules -o \
      -name venv -o \
      -name .venv -o \
      -name .expo -o \
      -name .git -o \
      -name dist -o \
      -name web-build -o \
      -name build -o \
      -name ios -o \
      -name android -o \
      -name .cursor -o \
    \) -prune -o \
    -type f \
    \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.py' -o -name '*.json' -o -name '*.md' \) \
    ! -name '.cursor-temp-read-*' \
    -print 2>/dev/null | sed 's|^\./||' | sort | head -n 400 || true
}

section_file() {
  local title="$1"
  local path="$2"
  echo ""
  echo "### $title (\`$path\`)"
  echo '```'
  if [[ -f "$ROOT/$path" ]]; then
    sed 's/^/    /' <"$ROOT/$path" | head -n 120 | sed 's/^    //'
    local lines
    lines=$(wc -l <"$ROOT/$path" | tr -d ' ')
    if [[ "$lines" -gt 120 ]]; then
      echo ""
      echo "... ($((lines - 120)) lignes supplémentaires — ouvrir le fichier dans le dépôt)"
    fi
  else
    echo "(fichier absent)"
  fi
  echo '```'
}

BODY=$(cat <<'HEADER'
<!-- Généré par scripts/export-ai-project-context.sh — ne pas éditer à la main ; régénérer après gros changements -->

# Contexte projet **Ryx** (pour assistant IA)

Ce document résume le dépôt **Ryx** : application mobile (Expo), API Node/Express/MongoDB, et microservice Python (IA). Aucun secret n’est inclus ; les vraies clés restent dans les `.env` (non versionnés).

## 1. Architecture (vue d’ensemble)

| Couche | Dossier | Stack | Rôle |
|--------|---------|-------|------|
| Mobile | `front-end/RyxMobile/` | Expo ~55, React Native 0.83, expo-router, TypeScript | App utilisateur : auth, dépenses, boutique, profil, chatbot assistant |
| API | `back-end/` | Express 5, Mongoose 9, MongoDB | REST sous préfixe `/api/*` |
| IA | `service-ai/` | FastAPI, Uvicorn, Google Gemini (`google-generativeai`), PyMongo optionnel | `POST /chat`, contexte financier utilisateur si `MONGO_URI` |

**Flux typique :** l’app mobile appelle le back-end (`EXPO_PUBLIC_API_URL`). Le chatbot peut appeler le service IA (`EXPO_PUBLIC_AI_SERVICE_URL` ou dérivation LAN + port).

**Ancien dossier** `front-end/` (hors `RyxMobile`) : squelette React Native CLI minimal ; l’app active est **RyxMobile**.

---

## 2. Back-end Node (`back-end/`)

- **Entrée :** `servers.js` (script npm `start`).
- **Base :** `config/db.js` + variables d’environnement (Mongo, port, etc. — voir `.env` local).
- **Préfixe API :** tout passe par `/api/...` sauf `/` et `/api/health`.

### Routes Express (montées dans `servers.js`)

HEADER
)

BODY+=$'\n```\n'
BODY+="$(grep -E "app\.use\('/api" "$ROOT/back-end/servers.js" 2>/dev/null || true)"
BODY+=$'\n```\n'

BODY+=$(cat <<'MID'

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

---

## 3. Mobile Expo (`front-end/RyxMobile/`)

- **Router :** `expo-router` — fichiers sous `app/`.
- **Onglets :** `app/(tabs)/` (navigation principale).
- **Écrans :** `app/screen/*` (dépenses, accueil, paramètres, boutique, chatbot, profil, etc.).
- **Auth :** `app/auth/*` (login, register, OTP, onboarding).
- **Clients HTTP :** `services/*.ts` (`auth.ts`, `expenses.ts`, `dashboard.ts`, `shop.ts`, `chatbot.ts`, …).
- **Thème / i18n :** `theme`, `locales/strings.ts`, hooks `useTranslation`, `useAppTheme`.

### Variables d’environnement (public Expo)

Voir `front-end/RyxMobile/.env.example` : `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_AI_SERVICE_URL` / `EXPO_PUBLIC_AI_PORT`, `EXPO_PUBLIC_AI_CONTEXT_SECRET` (si secret côté service IA).

**Important device réel :** `localhost` / `127.0.0.1` sur le téléphone ≠ le Mac ; utiliser l’IP LAN du Mac pour API et service IA.

---

## 4. Service IA Python (`service-ai/`)

- **Entrée :** `main.py` (FastAPI `app`).
- **Dépendances :** `requirements.txt` (FastAPI, Uvicorn, python-dotenv, google-generativeai, pymongo).
- **Contexte Mongo :** `mongo_context.py` — si `MONGO_URI` est défini et `user_mongo_id` envoyé, enrichit le prompt avec données Ryx (sans mot de passe).
- **Doc détaillée :** `service-ai/README.md`.
- **Lancement dev réseau local :** `uvicorn main:app --reload --host 0.0.0.0 --port 8081` (ou autre port, aligné avec `.env` mobile).

---

## 5. Inventaire de fichiers source (extrait)

Liste tronquée (~400 chemins max), sans `node_modules`, `venv`, `.git`, builds natifs.

MID
)

BODY+=$'\n```\n'
BODY+="$(file_tree)"
BODY+=$'\n```\n'

BODY+=$(section_file "package.json back-end" "back-end/package.json")
BODY+=$(section_file "package.json RyxMobile" "front-end/RyxMobile/package.json")
BODY+=$(section_file "requirements.txt service-ai" "service-ai/requirements.txt")
BODY+=$(section_file ".env.example back-end (sans secrets)" "back-end/.env.example")
BODY+=$(section_file ".env.example service-ai (sans secrets)" "service-ai/.env.example")
BODY+=$(section_file ".env.example mobile (sans secrets)" "front-end/RyxMobile/.env.example")

BODY+=$(cat <<'FOOTER'

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
- Service IA: `AI_RATE_LIMIT_CHAT_MAX`, `AI_RATE_LIMIT_CHAT_WINDOW_S` (par IP sur `POST /chat`)

FOOTER
)

if [[ "$STDOUT_ONLY" -eq 1 ]]; then
  printf '%s\n' "$BODY"
else
  # Si sortie dans un sous-dossier (ex. RAPPORT/...), s'assurer qu'il existe.
  mkdir -p "$(dirname "$OUT_FILE")"
  printf '%s\n' "$BODY" >"$OUT_FILE"
  echo "Écrit : $OUT_FILE"
  echo "Colle ce fichier dans ton chat IA ou attache-le en pièce jointe."
fi
