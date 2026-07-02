// server.js
const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const transactionRoutes = require('./routes/transactions');
const expensesRoutes = require('./routes/expenses');
const balanceRoutes = require('./routes/balance');
const userRoutes = require('./routes/users');
const recurringRoutes = require('./routes/recurring');
const questRoutes = require('./routes/quests');
const projectRoutes = require('./routes/projects');
const notificationRoutes = require('./routes/notifications');

// override: false → les variables déjà définies (ex: Render env vars) ont la priorité sur le .env local
dotenv.config({ override: false });

const app = express();

// Render / nginx : X-Forwarded-For est présent ; requis pour express-rate-limit (identification IP).
const trustProxyRaw = process.env.TRUST_PROXY;
if (trustProxyRaw === 'true' || trustProxyRaw === '1') {
  app.set('trust proxy', 1);
} else if (trustProxyRaw && !Number.isNaN(Number(trustProxyRaw))) {
  app.set('trust proxy', Number(trustProxyRaw));
} else if (process.env.RENDER || process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

function parseCorsOrigins(raw) {
  const list = String(raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list;
}

const CORS_ORIGINS = parseCorsOrigins(process.env.CORS_ORIGINS);

// CORS en premier pour les requêtes cross-origin
app.use(
  cors({
    origin(origin, callback) {
      // Pas d'Origin: requêtes server-to-server, curl, ou certaines configs mobile.
      if (!origin) return callback(null, true);
      // Si aucune whitelist n'est définie, on reste permissif (comportement dev).
      if (!CORS_ORIGINS.length) return callback(null, true);
      if (CORS_ORIGINS.includes(origin)) return callback(null, true);
      return callback(new Error('CORS: Origin non autorisée'), false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

// Log des requêtes API (ne pas monter sur `/api` seul : évite tout effet de bord avec les routes `/api/...`)
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    console.log(`${req.method} ${req.originalUrl}`);
  }
  next();
});

app.get('/', (req, res) => {
  res.send('Backend Ryx fonctionne !');
});

app.get('/api/health', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const { isEmailOtpConfigured, getEmailJsConfig } = require('./services/emailSend');
  const emailjs = getEmailJsConfig();
  res.send(
    JSON.stringify({
      ok: true,
      message: 'Back-end accessible',
      emailOtp: isEmailOtpConfigured(),
      emailjs: emailjs
        ? {
            serviceId: Boolean(emailjs.serviceId),
            templateId: Boolean(emailjs.templateId),
            publicKey: Boolean(emailjs.publicKey),
            privateKey: Boolean(emailjs.privateKey),
          }
        : null,
      whatsappMock: process.env.WHATSAPP_MOCK === 'true' || process.env.WHATSAPP_MOCK === '1',
    })
  );
});

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
app.use('/api/notifications', notificationRoutes);

app.use((req, res) => {
  console.warn('[404 Ryx API]', req.method, req.originalUrl);
  res.setHeader('Content-Type', 'application/json');
  res.status(404).send(JSON.stringify({ error: 'Route non trouvée' }));
});

app.use((err, req, res, next) => {
  console.error(err);
  if (!res.headersSent) {
    res.setHeader('Content-Type', 'application/json');
    const isDev = process.env.NODE_ENV !== 'production';
    res.status(500).send(
      JSON.stringify({
        error: 'Erreur serveur',
        ...(isDev ? { details: err.message } : {}),
      })
    );
  }
});

const PORT = process.env.PORT || 3000;

async function start() {
  await connectDB();
  const host = '0.0.0.0';
  app.listen(PORT, host, () => {
    console.log(`Serveur lancé sur http://${host}:${PORT} (accessible depuis le réseau local)`);
  });
}

if (require.main === module) {
  start().catch((err) => {
    console.error('Démarrage impossible:', err);
    process.exit(1);
  });
}

module.exports = app;
