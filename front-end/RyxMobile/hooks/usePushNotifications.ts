import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerForPushNotifications } from '../services/notifications';
import { savePushToken } from '../services/auth';

/**
 * Mapping du champ `screen` (envoyé par le backend) vers la route Expo Router.
 * Adapter si la structure de navigation change.
 */
const SCREEN_ROUTES: Record<string, string> = {
  Dashboard: '/screen/accueil',
  Quests: '/screen/ryxquest',
  Expenses: '/screen/depenses',
  Chatbot: '/screen/chatbot',
  Profile: '/screen/mes-informations',
};

const NOTIF_PREF_KEY = 'ryx_notif_enabled';

export const usePushNotifications = () => {
  const router = useRouter();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // Respecter la préférence de l'utilisateur : ne pas enregistrer si désactivé
    AsyncStorage.getItem(NOTIF_PREF_KEY).then(async (val) => {
      const isEnabled = val === null || val === 'true'; // true par défaut si jamais défini
      if (isEnabled) {
        const token = await registerForPushNotifications();
        if (token) {
          savePushToken(token).catch((err) => {
            if (__DEV__) console.warn('[Ryx Push] Erreur envoi token:', err);
          });
        }
      }
    });

    // Écoute des notifications reçues (app au premier plan)
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        if (__DEV__) console.log('[Ryx Push] Notification reçue:', notification);
      }
    );

    // Navigation sur tap d'une notification (app fermée ou en arrière-plan)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<string, unknown>;
        const screen = typeof data?.screen === 'string' ? data.screen : null;
        if (screen) {
          const route = SCREEN_ROUTES[screen];
          if (route) {
            router.push(route as any);
          } else if (__DEV__) {
            console.warn('[Ryx Push] Route inconnue pour screen:', screen);
          }
        }
      }
    );

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);
};
