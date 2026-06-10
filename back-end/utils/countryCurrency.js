/**
 * Devise ISO 4217 par pays — données partagées avec le mobile :
 * `front-end/RyxMobile/utils/countryToCurrency.json`
 */
const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, 'countryToCurrency.json');
const COUNTRY_TO_CURRENCY = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

function getCurrencyForCountryIso(iso) {
  if (!iso || typeof iso !== 'string') return 'XOF';
  const c = iso.trim().toUpperCase();
  return COUNTRY_TO_CURRENCY[c] || 'XOF';
}

module.exports = { getCurrencyForCountryIso, COUNTRY_TO_CURRENCY };
