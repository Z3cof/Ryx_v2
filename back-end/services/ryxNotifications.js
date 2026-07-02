const { sendPushNotification } = require('./pushNotificationService');
const User = require('../models/User');
const { getExpectedCurrencyForUserId } = require('../utils/userCurrency');

/**
 * Notification : budget atteint à 80%
 */
const notifyBudget80 = async (userId, budgetRestant) => {
  const user = await User.findById(userId).select('pushToken');
  if (!user?.pushToken) return;
  const currency = await getExpectedCurrencyForUserId(userId);
  await sendPushNotification(
    user.pushToken,
    '⚠️ Budget bientôt épuisé',
    `Tu as dépensé 80% de ton budget. Il te reste ${budgetRestant.toLocaleString('fr-FR')} ${currency}.`,
    { screen: 'Dashboard', type: 'budget_80' }
  );
};

/**
 * Notification : budget dépassé
 */
const notifyBudgetDepasse = async (userId, depassement) => {
  const user = await User.findById(userId).select('pushToken');
  if (!user?.pushToken) return;
  const currency = await getExpectedCurrencyForUserId(userId);
  await sendPushNotification(
    user.pushToken,
    '🚨 Budget dépassé',
    `Tu as dépassé ton budget de ${depassement.toLocaleString('fr-FR')} ${currency} ce mois-ci.`,
    { screen: 'Dashboard', type: 'budget_depasse' }
  );
};

/**
 * Notification : bilan de fin de mois
 */
const notifyBilanMensuel = async (userId, epargne) => {
  const user = await User.findById(userId).select('pushToken');
  if (!user?.pushToken) return;
  const currency = await getExpectedCurrencyForUserId(userId);
  await sendPushNotification(
    user.pushToken,
    '📊 Ton bilan mensuel est prêt',
    `Tu as épargné ${epargne.toLocaleString('fr-FR')} ${currency} ce mois-ci. Bravo !`,
    { screen: 'Dashboard', type: 'bilan_mensuel' }
  );
};

/**
 * Notification : nouveau défi RyxQuest disponible
 */
const notifyNouveauDefi = async (userId, titreDefi) => {
  const user = await User.findById(userId).select('pushToken');
  if (!user?.pushToken) return;
  await sendPushNotification(
    user.pushToken,
    '🎯 Nouveau défi disponible',
    `${titreDefi} — Relève ce défi et gagne des XP !`,
    { screen: 'Quests', type: 'nouveau_defi' }
  );
};

/**
 * Notification : défi complété
 */
const notifyDefiComplete = async (userId, titreDefi, xpGagne) => {
  const user = await User.findById(userId).select('pushToken');
  if (!user?.pushToken) return;
  await sendPushNotification(
    user.pushToken,
    '🏆 Défi complété !',
    `Tu as complété "${titreDefi}" et gagné ${xpGagne} XP !`,
    { screen: 'Quests', type: 'defi_complete' }
  );
};

/**
 * Notification : défi expire bientôt
 */
const notifyDefiExpireBientot = async (userId, titreDefi, heuresRestantes) => {
  const user = await User.findById(userId).select('pushToken');
  if (!user?.pushToken) return;
  await sendPushNotification(
    user.pushToken,
    '⏰ Défi sur le point d\'expirer',
    `"${titreDefi}" expire dans ${heuresRestantes}h. Dépêche-toi !`,
    { screen: 'Quests', type: 'defi_expire' }
  );
};

/**
 * Notification : montée de niveau
 */
const notifyNouveauNiveau = async (userId, nouveauNiveau) => {
  const user = await User.findById(userId).select('pushToken');
  if (!user?.pushToken) return;
  await sendPushNotification(
    user.pushToken,
    '⭐ Nouveau niveau atteint !',
    `Tu passes au niveau ${nouveauNiveau} ! Continue comme ça.`,
    { screen: 'Quests', type: 'nouveau_niveau' }
  );
};

/**
 * Notification : rappel règle récurrente
 */
const notifyRappelRecurrent = async (userId, labelRegle, montant) => {
  const user = await User.findById(userId).select('pushToken');
  if (!user?.pushToken) return;
  const currency = await getExpectedCurrencyForUserId(userId);
  await sendPushNotification(
    user.pushToken,
    '🔔 Rappel de paiement',
    `${labelRegle} — ${montant.toLocaleString('fr-FR')} ${currency} est dû demain.`,
    { screen: 'Expenses', type: 'rappel_recurrent' }
  );
};

/**
 * Notification : conseil mensuel de Rixy
 */
const notifyConseilRixy = async (userId, economieEstimee) => {
  const user = await User.findById(userId).select('pushToken');
  if (!user?.pushToken) return;
  const currency = await getExpectedCurrencyForUserId(userId);
  await sendPushNotification(
    user.pushToken,
    '💡 Rixy a un conseil pour toi',
    `Tu pourrais économiser environ ${economieEstimee.toLocaleString('fr-FR')} ${currency} ce mois-ci.`,
    { screen: 'Chatbot', type: 'conseil_rixy' }
  );
};

/**
 * Notification : nouvelle connexion détectée
 */
const notifyNouvelleConnexion = async (userId) => {
  const user = await User.findById(userId).select('pushToken');
  if (!user?.pushToken) return;
  await sendPushNotification(
    user.pushToken,
    '🔐 Nouvelle connexion',
    `Une nouvelle connexion a été effectuée sur ton compte. C'est toi ?`,
    { screen: 'Profile', type: 'nouvelle_connexion' }
  );
};

module.exports = {
  notifyBudget80,
  notifyBudgetDepasse,
  notifyBilanMensuel,
  notifyNouveauDefi,
  notifyDefiComplete,
  notifyDefiExpireBientot,
  notifyNouveauNiveau,
  notifyRappelRecurrent,
  notifyConseilRixy,
  notifyNouvelleConnexion,
};
