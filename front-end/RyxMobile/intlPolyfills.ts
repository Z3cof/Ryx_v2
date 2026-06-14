/**
 * Hermes / React Native : Intl.DisplayNames est souvent absent → éviter `new undefined`
 * et fournir les noms de pays pour le sélecteur d'indicatif.
 *
 * Chemins alignés sur le champ "exports" des paquets @formatjs (évite les WARN Metro).
 */
import '@formatjs/intl-locale/polyfill.js';
import '@formatjs/intl-displaynames/polyfill.js';
import '@formatjs/intl-displaynames/locale-data/en.js';
import '@formatjs/intl-displaynames/locale-data/fr.js';
