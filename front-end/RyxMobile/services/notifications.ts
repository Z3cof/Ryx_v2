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

export type PushRegisterResult = {
  token: string | null;
  error?: string;
};

/**
 * Demande les permissions push et retourne le token Expo ou le message d'erreur.
 */
export const registerForPushNotifications = async (): Promise<PushRegisterResult> => {
  if (!Device.isDevice) {
    return { token: null, error: 'Simulateur détecté (les notifications nécessitent un appareil physique).' };
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return { token: null, error: 'Permission refusée (POST_NOTIFICATIONS non accordée par l’utilisateur).' };
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
    return { token: tokenData.data };
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    return { 
      token: null, 
      error: `Erreur ExpoToken : ${errMsg} (EAS projectId : ${projectId || 'indéfini'})` 
    };
  }
};
