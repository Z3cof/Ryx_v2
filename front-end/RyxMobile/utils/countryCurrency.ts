// Même donnée que le back-end (fichier JSON partagé).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const COUNTRY_TO_CURRENCY: Record<string, string> = require('./countryToCurrency.json');

export function getCurrencyForCountry(iso: string): string {
  const c = iso?.trim().toUpperCase();
  if (!c) return 'XOF';
  return COUNTRY_TO_CURRENCY[c] || 'XOF';
}
