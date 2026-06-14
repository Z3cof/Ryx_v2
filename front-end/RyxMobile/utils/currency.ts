import { getCurrencyForCountry } from './countryCurrency';

/** Défaut historique (UEMOA / produit) */
export const APP_CURRENCY_CODE = 'XOF' as const;

export type MoneyLocale = 'fr' | 'en';

/** Réponse dashboard : pays (countryIso) puis champ `currency` renvoyé par l’API (aligné pays ↔ devise). */
export function walletCurrencyFromDashboard(
  data: { currency?: string; user?: { countryIso?: string } } | null | undefined
): string {
  const c = data?.currency?.trim().toUpperCase();
  if (c) return c;
  const iso = data?.user?.countryIso?.trim().toUpperCase() ?? '';
  if (iso.length === 2 && /^[A-Z]{2}$/.test(iso)) {
    return getCurrencyForCountry(iso);
  }
  return APP_CURRENCY_CODE;
}

/**
 * Formate un montant avec la devise ISO 4217 et la locale (séparateurs, symbole).
 */
export function formatMoney(amount: number, currencyCode: string, locale: MoneyLocale = 'fr'): string {
  const n = Math.round(Number(amount));
  const loc = locale === 'en' ? 'en-US' : 'fr-FR';
  try {
    return new Intl.NumberFormat(loc, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${n.toLocaleString(loc)} ${currencyCode}`;
  }
}

/** @deprecated Utiliser formatMoney avec la devise du compte (API). */
export function formatAmountCFA(amount: number): string {
  return formatMoney(amount, APP_CURRENCY_CODE, 'fr');
}
