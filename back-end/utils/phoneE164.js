const { parsePhoneNumberFromString } = require('libphonenumber-js');

function normalizeAndValidate(phoneE164) {
  const raw = String(phoneE164 || '').trim();
  const parsed = parsePhoneNumberFromString(raw);
  if (!parsed || !parsed.isValid()) {
    return null;
  }
  return parsed.format('E.164');
}

module.exports = { normalizeAndValidate };
