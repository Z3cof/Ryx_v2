import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Configuration de l'affichage des notifications quand l'app est au premier plan
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Demande les permissions push et retourne le token Expo.
 * Retourne null sur simulateur ou si permission refusée.
 */
export const registerForPushNotifications = async (): Promise<string | null> => {
  if (!Device.isDevice) {
    if (__DEV__) console.warn('[Ryx Push] Notifications push nécessitent un appareil physique.');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    if (__DEV__) console.warn('[Ryx Push] Permission notifications refusée.');
    return null;
  }

  // Canal Android obligatoire (ignoré sur iOS)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('ryx-default', {
      name: 'Ryx Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1D9E75',
      sound: 'default',
    });
  }

  // Récupération du token (projectId requis pour Expo Go / builds EAS)
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    if (__DEV__) console.log('[Ryx Push] Token obtenu:', tokenData.data);
    return tokenData.data;
  } catch (err) {
    console.error('[Ryx Push] Erreur obtention token:', err);
    return null;
  }
};
