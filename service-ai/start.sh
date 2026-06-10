#!/usr/bin/env bash
# Lance le service IA Ryx (FastAPI + Gemini) sur le port 8082.
# Nécessite Python 3.11 ou 3.12 (pas 3.14 : google-generativeai / protobuf incompatible).

set -euo pipefail
cd "$(dirname "$0")"

PY=""
for candidate in python3.12 python3.11 python3; do
  if command -v "$candidate" >/dev/null 2>&1; then
    ver=$("$candidate" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
    major=${ver%%.*}
    minor=${ver#*.}
    if [ "$major" = "3" ] && [ "$minor" -ge 11 ] && [ "$minor" -le 12 ]; then
      PY=$candidate
      break
    fi
  fi
done

if [ -z "$PY" ]; then
  echo "Erreur: installe Python 3.12 (brew install python@3.12) — Python 3.14 casse google-generativeai."
  exit 1
fi

echo "Python: $PY ($($PY --version))"

if [ ! -d venv ] || ! venv/bin/python -c 'import sys; assert sys.version_info[:2] in ((3,11),(3,12))' 2>/dev/null; then
  echo "Création du venv…"
  rm -rf venv
  "$PY" -m venv venv
  . venv/bin/activate
  pip install --upgrade pip
  pip install -r requirements.txt
else
  . venv/bin/activate
fi

export PORT="${PORT:-8082}"
echo "Service IA → http://0.0.0.0:${PORT} (health: /health)"
exec python -m uvicorn main:app --host 0.0.0.0 --port "$PORT" --reload
