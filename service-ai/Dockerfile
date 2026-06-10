# ── Ryx Service AI (Python / FastAPI) ──
FROM python:3.12-slim

WORKDIR /app

# Dépendances Python (wheels binaires, pas de compilation)
COPY requirements.txt ./
RUN pip install --upgrade pip && \
    pip install --no-cache-dir --prefer-binary -r requirements.txt

# Code source
COPY . .

ENV PORT=8082
EXPOSE 8082

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8082}"]