import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

/**
 * Déduit le pays (ISO) depuis le numéro saisi : format international (+…) ou national avec pays par défaut.
 * Retourne `null` si le numéro n’est pas encore valide.
 */
export function getDetectedCountryFromPhone(
  nationalPhone: string,
  defaultCountry: CountryCode
): CountryCode | null {
  const trimmed = nationalPhone.replace(/\s/g, '');
  if (!trimmed) return null;

  if (trimmed.startsWith('+')) {
    const p = parsePhoneNumberFromString(trimmed);
    return p?.isValid() && p.country ? p.country : null;
  }

  const p = parsePhoneNumberFromString(trimmed, defaultCountry);
  return p?.isValid() && p.country ? p.country : null;
}

/**
 * Pour l’UI : pays dès que le parsing est « possible » (souvent avant `isValid()`),
 * afin d’afficher pays / devise pendant la saisie.
 */
export function getCountryHintForPhoneDisplay(
  nationalPhone: string,
  defaultCountry: CountryCode
): CountryCode | null {
  const trimmed = nationalPhone.replace(/\s/g, '');
  if (!trimmed) return null;

  const p = trimmed.startsWith('+')
    ? parsePhoneNumberFromString(trimmed)
    : parsePhoneNumberFromString(trimmed, defaultCountry);

  if (!p?.country) return null;
  return p.isPossible() ? p.country : null;
}
