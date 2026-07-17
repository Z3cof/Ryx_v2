const { parsePhoneNumberFromString } = require('libphonenumber-js');

/**
 * Envoie un message WhatsApp via Fonnte (fonnte.com).
 *
 * Variables d'environnement requises :
 * - FONNTE_TOKEN  : token de l'appareil récupéré dans le dashboard Fonnte
 *
 * Variables obsolètes (Evolution API / Railway) — ne plus utiliser :
 * - EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE_NAME
 *
 * Si WHATSAPP_MOCK=true ou FONNTE_TOKEN manquant : pas d'appel API (le code est logué côté contrôleur).
 */
function isWhatsappMockEnabled() {
  const isTest = process.env.NODE_ENV === 'test';
  const isMock = process.env.WHATSAPP_MOCK === '1' || process.env.WHATSAPP_MOCK === 'true';
  const hasFonnteConfig = !!process.env.FONNTE_TOKEN;
  return isTest || isMock || !hasFonnteConfig;
}

async function sendOtpTemplate(phoneDigitsWithoutPlus, otpCode) {
  const useMock = isWhatsappMockEnabled();

  if (useMock) {
    return { mock: true };
  }

  const token = process.env.FONNTE_TOKEN;
  // Fonnte accepte le numéro avec indicatif mais sans le "+"
  const to = String(phoneDigitsWithoutPlus).replace(/^\+/, '');
  const message = `Votre code de vérification Ryx est : ${otpCode}`;

  // Tenter d'extraire le code pays pour éviter le formatage par défaut indonésien (+62) de Fonnte
  let countryCode = '';
  const parsed = parsePhoneNumberFromString('+' + to);
  if (parsed && parsed.countryCallingCode) {
    countryCode = String(parsed.countryCallingCode);
  }

  const formData = new URLSearchParams();
  formData.append('target', to);
  formData.append('message', message);
  if (countryCode) {
    formData.append('countryCode', countryCode);
  }

  const response = await fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: {
      'Authorization': token,
    },
    body: formData,
  });

  const text = await response.text();
  let data = {};
  try { data = JSON.parse(text); } catch (_) {}

  if (!response.ok || data.status === false) {
    throw new Error(`Fonnte API ${response.status}: ${data.reason || text}`);
  }

  return { mock: false };
}

module.exports = { sendOtpTemplate, isWhatsappMockEnabled };
