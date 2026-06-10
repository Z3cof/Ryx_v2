# ── Ryx Back-end (Node / Express) ──
FROM node:20-alpine

WORKDIR /app

# Dépendances (couche cache)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Code source
COPY . .

EXPOSE 3000

CMD ["node", "servers.js"]
