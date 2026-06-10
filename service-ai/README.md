# Service IA Ryx

Petit service HTTP pour l’assistant Ryx (**FastAPI + Google Gemini**).  
Quota gratuit dispo via [Google AI Studio](https://aistudio.google.com/app/apikey) (limites selon Google).

## 1. Installation

**Python 3.11 ou 3.12** (pas 3.14 : le SDK Gemini plante au démarrage).

Depuis le dossier `service-ai` :

```bash
./start.sh
```

Ou manuellement :

```bash
python3.12 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## 2. Configuration

```bash
cp .env.example .env
```

- `GEMINI_API_KEY` : clé créée sur [AI Studio — API keys](https://aistudio.google.com/app/apikey) (tu peux aussi utiliser `GOOGLE_API_KEY` à la place).
- `GEMINI_MODEL` : modèle principal (défaut **`gemini-2.5-flash`**). Les anciens IDs du type **`gemini-1.5-flash`** renvoient souvent **404** sur l’API récente.
- `GEMINI_MODEL_FALLBACK` : optionnel (2ᵉ essai). Sinon le serveur enchaîne automatiquement **`gemini-flash-latest`**, **`gemini-2.0-flash`**, etc. en cas de **404** ou **429**.
- `PORT` : port HTTP (par défaut **`8082`**, aligné avec `docker-compose` et `EXPO_PUBLIC_AI_SERVICE_URL`).
- `AI_CORS_ORIGINS` : optionnel — si défini, liste d’origines autorisées (séparées par des virgules). Sinon permissif en dev.
- `MONGO_URI` : optionnel — **même valeur que le back Node** (`mongodb://…/ryxdb`). Si défini, chaque message peut inclure `user_mongo_id` : le service lit le profil, le mois en cours (entrées / sorties / net), budgets, soldes, catégories, récurrents, objectifs projet, boutique vendeur (si marchand), et les dernières transactions — puis ajoute ce bloc au prompt (sans email ni mot de passe).
- `MONGO_DB_NAME` : optionnel si l’URI n’a pas de segment de base (défaut `ryxdb`).
- `RYX_AI_SERVICE_SECRET` : optionnel — si non vide, **`POST /chat` exige l’en-tête `X-Ryx-Ai-Secret`** avec la même valeur (à configurer aussi dans RyxMobile : `EXPO_PUBLIC_AI_CONTEXT_SECRET`). Limite l’usage abusif si l’URL IA est exposée ; ce n’est pas un remplacement d’un vrai contrôle d’accès (la clé est encore dans l’app).
- `AI_RATE_LIMIT_CHAT_MAX` / `AI_RATE_LIMIT_CHAT_WINDOW_S` : optionnel — limite simple par IP sur `POST /chat` (défaut: 30 requêtes / 10 minutes).

Si ton ancien `.env` contenait `OPENAI_API_KEY`, remplace par `GEMINI_API_KEY` et réinstalle les deps :

```bash
pip install -r requirements.txt
```

## 3. Démarrage

```bash
./start.sh
```

Équivalent manuel (téléphone sur le même Wi‑Fi → `--host 0.0.0.0` obligatoire) :

```bash
source venv/bin/activate
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8082
```

Vérifie : `curl http://127.0.0.1:8082/health` → `"status":"ok"` et `"gemini_configured":true`.

## 4. API

- `GET /health` — statut + nom du modèle.
- `POST /chat` — corps JSON :

```json
{
  "locale": "fr",
  "user_name": "Fatou",
  "user_mongo_id": "674a1b2c3d4e5f6789abcdef",
  "messages": [
    { "role": "user", "content": "Combien j'ai dépensé ce mois-ci ?" }
  ]
}
```

Réponse : `{ "reply": "…" }`.  
Avec `MONGO_URI`, le modèle reçoit un contexte financier personnalisé (mois UTC, budget, récurrents, etc.). Il répond sur l’app Ryx, les finances de l’utilisateur, et les conseils d’achat **liés au budget** (ex. voiture) ; il refuse la culture générale hors sujet.

Le mobile (`front-end/RyxMobile`) appelle automatiquement ce service en **développement** si l’URL est résolue (port **`8082`** par défaut, même IP que `EXPO_PUBLIC_API_URL` quand `EXPO_PUBLIC_USE_LAN=true`). Sinon tu peux forcer `EXPO_PUBLIC_AI_SERVICE_URL` dans le `.env` de RyxMobile. Sans URL IA configurée, l’assistant reste en mode règles locales.

## 5. Erreur 429 / quota dépassé

Le plan gratuit impose des **limites par minute et par jour** (voir [Rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)). En cas de **429** :

1. Attends ~1 minute avant de renvoyer un message.
2. Dans `service-ai/.env`, essaie un autre modèle de la chaîne (`gemini-flash-latest`, `gemini-2.0-flash`, etc.).
3. Vérifie sur [Google AI Studio](https://aistudio.google.com/) que le projet / la clé a bien accès au modèle.
4. Si besoin, active une **facturation** Google Cloud pour des plafonds plus hauts (voir la doc Google).

Après modification du `.env`, redémarre uvicorn.
