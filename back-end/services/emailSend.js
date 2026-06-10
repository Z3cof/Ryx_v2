const nodemailer = require('nodemailer');
const emailjs = require('@emailjs/nodejs');

const RESEND_API_URL = 'https://api.resend.com/emails';

function isDeployedProduction() {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.RENDER === 'true' ||
    process.env.RENDER === '1' ||
    Boolean(process.env.RENDER_EXTERNAL_URL)
  );
}

function envFirst(...keys) {
  for (const key of keys) {
    const v = process.env[key];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return '';
}

function getEmailJsConfig() {
  const serviceId = envFirst('EMAILJS_SERVICE_ID', 'MAILJS_SERVICE_ID');
  const templateId = envFirst('EMAILJS_TEMPLATE_ID', 'MAILJS_TEMPLATE_ID');
  const publicKey = envFirst('EMAILJS_PUBLIC_KEY', 'MAILJS_PUBLIC_KEY');
  const privateKey = envFirst('EMAILJS_PRIVATE_KEY', 'MAILJS_PRIVATE_KEY');
  if (!serviceId || !templateId || !publicKey) return null;
  return { serviceId, templateId, publicKey, privateKey };
}

function resolveFromAddress() {
  return envFirst('EMAIL_FROM', 'RESEND_FROM') || 'Ryx <noreply@ryx.com>';
}

function buildOtpEmailContent(otpCode) {
  const subject = 'Votre code de validation Ryx';
  const text = `Votre code de validation Ryx est : ${otpCode}. Il est valide pendant 5 minutes.`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${subject}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: #f8fafc;
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
        }
        .header {
          background-color: #4f46e5;
          padding: 32px;
          text-align: center;
        }
        .header h1 {
          color: #ffffff;
          margin: 0;
          font-size: 24px;
          font-weight: 700;
        }
        .content {
          padding: 40px 32px;
          color: #334155;
          line-height: 1.6;
        }
        .content p {
          margin: 0 0 24px 0;
          font-size: 16px;
        }
        .otp-container {
          background-color: #f1f5f9;
          border-radius: 12px;
          padding: 24px;
          text-align: center;
          margin-bottom: 24px;
        }
        .otp-code {
          font-family: "Courier New", Courier, monospace;
          font-size: 36px;
          font-weight: 700;
          letter-spacing: 6px;
          color: #4f46e5;
          margin: 0;
        }
        .footer {
          background-color: #f8fafc;
          padding: 24px 32px;
          border-top: 1px solid #e2e8f0;
          text-align: center;
          font-size: 13px;
          color: #64748b;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Ryx</h1>
        </div>
        <div class="content">
          <p>Bonjour,</p>
          <p>Merci de vous inscrire sur Ryx. Pour valider votre adresse e-mail et finaliser votre inscription, veuillez utiliser le code de sécurité temporaire ci-dessous :</p>
          <div class="otp-container">
            <div class="otp-code">${otpCode}</div>
          </div>
          <p style="color: #64748b; font-size: 14px;">Ce code est valide pendant 5 minutes. Ne le partagez jamais avec qui que ce soit.</p>
          <p>Si vous n'êtes pas à l'origine de cette inscription, vous pouvez ignorer cet e-mail en toute sécurité.</p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Ryx. Tous droits réservés.
        </div>
      </div>
    </body>
    </html>
  `;
  return { subject, html, text };
}

function buildPasswordResetEmailContent(otpCode) {
  const subject = 'Réinitialisation de votre mot de passe Ryx';
  const text = `Votre code de réinitialisation Ryx est : ${otpCode}. Il est valide pendant 5 minutes.`;
  const html = buildOtpEmailContent(otpCode).html.replace(
    'Merci de vous inscrire sur Ryx. Pour valider votre adresse e-mail et finaliser votre inscription, veuillez utiliser le code de sécurité temporaire ci-dessous :',
    'Vous avez demandé à réinitialiser votre mot de passe Ryx. Utilisez le code de sécurité temporaire ci-dessous :'
  );
  return { subject, html, text };
}

function logMockOtp(label, email, otpCode, from, subject) {
  console.log('\n=============================================');
  console.log(label);
  if (from) console.log(`De: ${from}`);
  console.log(`À: ${email}`);
  if (subject) console.log(`Objet: ${subject}`);
  console.log(`Code OTP: ${otpCode}`);
  console.log('=============================================\n');
}

function isResendSmtpHost() {
  const host = String(process.env.SMTP_HOST || '').trim().toLowerCase();
  return host === 'smtp.resend.com';
}

function getResendApiKey() {
  const explicit = envFirst('RESEND_API_KEY');
  if (explicit) return explicit;
  if (isResendSmtpHost()) {
    const pass = envFirst('SMTP_PASS');
    if (pass.startsWith('re_')) return pass;
  }
  return '';
}

/**
 * EmailJS (HTTPS) — recommandé sur Render, sans domaine propre (via Gmail connecté dans EmailJS).
 * Template EmailJS : champs « To » = {{to_email}}, corps avec {{otp_code}}.
 */
async function sendViaEmailJs(email, otpCode, content) {
  const cfg = getEmailJsConfig();
  if (!cfg) return null;

  const emailContent = content || buildOtpEmailContent(otpCode);
  const { subject, text, html } = emailContent;
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toLocaleString('fr-FR', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
  });
  const templateParams = {
    to_email: email,
    user_email: email,
    email,
    otp_code: otpCode,
    otp: otpCode,
    passcode: otpCode,
    subject,
    message: text,
    html_message: html,
    time: expiresAt,
  };

  const credentials = { publicKey: cfg.publicKey };
  if (cfg.privateKey) credentials.privateKey = cfg.privateKey;

  try {
    const response = await emailjs.send(cfg.serviceId, cfg.templateId, templateParams, credentials);
    console.log(`[EMAIL OTP EmailJS] Envoyé à ${email}. Status: ${response.status}`);
    return { mock: false, messageId: String(response.text || response.status), provider: 'emailjs' };
  } catch (err) {
    const status = err?.status;
    const detail = err?.text || err?.message || String(err);
    const hint =
      status === 403 && /non-browser|browser/i.test(String(detail))
        ? ' Active « Allow API for non-browser applications » dans EmailJS → Account → Security.'
        : '';
    throw new Error(`EmailJS (${status || 'erreur'}): ${detail}${hint}`);
  }
}

async function sendViaResend(email, otpCode, content) {
  const apiKey = getResendApiKey();
  if (!apiKey) return null;

  const from = resolveFromAddress();
  const { subject, html, text } = content || buildOtpEmailContent(otpCode);

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'ryx-backend/1.0',
    },
    body: JSON.stringify({ from, to: [email], subject, html, text }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data?.message || data?.error || res.statusText;
    throw new Error(`Resend (${res.status}): ${detail}`);
  }

  console.log(`[EMAIL OTP Resend] Envoyé à ${email}. ID: ${data.id || 'n/a'}`);
  return { mock: false, messageId: data.id, provider: 'resend' };
}

function getTransporter() {
  if (isResendSmtpHost() && getResendApiKey()) return null;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS ? String(process.env.SMTP_PASS).replace(/\s/g, '') : '';
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

async function sendViaSmtp(email, otpCode, content) {
  const transporter = getTransporter();
  if (!transporter) return null;

  const from = resolveFromAddress();
  const { subject, html, text } = content || buildOtpEmailContent(otpCode);

  const info = await transporter.sendMail({ from, to: email, subject, text, html });
  console.log(`[EMAIL OTP SMTP] Envoyé à ${email}. Message ID: ${info.messageId}`);
  return { mock: false, messageId: info.messageId, provider: 'smtp' };
}

function isEmailOtpConfigured() {
  return Boolean(getEmailJsConfig() || getResendApiKey() || getTransporter());
}

function hasEmailProvider() {
  return isEmailOtpConfigured();
}

async function trySendWithFallback(email, otpCode, content) {
  if (process.env.NODE_ENV === 'test') {
    return null;
  }
  const attempts = [
    { name: 'EmailJS', fn: () => sendViaEmailJs(email, otpCode, content) },
    { name: 'Resend', fn: () => sendViaResend(email, otpCode, content) },
    { name: 'SMTP', fn: () => sendViaSmtp(email, otpCode, content) },
  ];

  let lastError = null;
  for (const { name, fn } of attempts) {
    try {
      const result = await fn();
      if (result) return result;
    } catch (error) {
      lastError = error;
      console.error(`[EMAIL OTP] Échec ${name} (à ${email}):`, error.message || error);
    }
  }

  if (lastError && isDeployedProduction()) throw lastError;
  return null;
}

/**
 * Envoie un email OTP.
 * Priorité : EmailJS (HTTPS) → Resend → SMTP → simulation console (dev).
 */
async function sendOtpEmail(email, otpCode) {
  const from = resolveFromAddress();
  const content = buildOtpEmailContent(otpCode);
  const { subject } = content;

  const sent = await trySendWithFallback(email, otpCode, content);
  if (sent) return sent;

  logMockOtp('[EMAIL OTP SIMULÉ (MOCK)]', email, otpCode, from, subject);
  return { mock: true };
}

async function sendPasswordResetEmail(email, otpCode) {
  const from = resolveFromAddress();
  const content = buildPasswordResetEmailContent(otpCode);
  const { subject } = content;

  const sent = await trySendWithFallback(email, otpCode, content);
  if (sent) return sent;

  logMockOtp('[EMAIL RESET SIMULÉ (MOCK)]', email, otpCode, from, subject);
  return { mock: true };
}

module.exports = {
  sendOtpEmail,
  sendPasswordResetEmail,
  buildOtpEmailContent,
  buildPasswordResetEmailContent,
  hasEmailProvider,
  isEmailOtpConfigured,
  isDeployedProduction,
  getEmailJsConfig,
};
