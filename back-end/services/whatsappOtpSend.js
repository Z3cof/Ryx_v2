/**
 * Envoie un message WhatsApp via Evolution API.
 *
 * Variables d’environnement :
 * - EVOLUTION_API_URL
 * - EVOLUTION_API_KEY
 * - EVOLUTION_INSTANCE_NAME
 *
 * Si WHATSAPP_MOCK=true ou clés manquantes : pas d’appel API (le code est logué côté contrôleur).
 */
function isWhatsappMockEnabled() {
  const isTest = process.env.NODE_ENV === 'test';
  const isMock = process.env.WHATSAPP_MOCK === '1' || process.env.WHATSAPP_MOCK === 'true';
  const hasEvolutionConfig =
    process.env.EVOLUTION_API_URL &&
    process.env.EVOLUTION_API_KEY &&
    process.env.EVOLUTION_INSTANCE_NAME;
  return isTest || isMock || !hasEvolutionConfig;
}

async function sendOtpTemplate(phoneDigitsWithoutPlus, otpCode) {
  const useMock = isWhatsappMockEnabled();

  if (useMock) {
    return { mock: true };
  }

  const apiUrl = process.env.EVOLUTION_API_URL.replace(/\/$/, '');
  const instance = process.env.EVOLUTION_INSTANCE_NAME;
  const apiKey = process.env.EVOLUTION_API_KEY;
  const to = String(phoneDigitsWithoutPlus).replace(/^\+/, '');

  const payload = JSON.stringify({
    number: to,
    text: `Votre code de vérification Ryx est : ${otpCode}`
  });

  const response = await fetch(`${apiUrl}/message/sendText/${instance}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': apiKey
    },
    body: payload
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Evolution API ${response.status}: ${text}`);
  }

  return { mock: false };
}

module.exports = { sendOtpTemplate, isWhatsappMockEnabled };
