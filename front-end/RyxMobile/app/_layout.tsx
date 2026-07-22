import '../intlPolyfills';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { useFonts } from 'expo-font';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AppearanceProvider } from '@/contexts/AppearanceContext';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { useColorScheme } from '@/components/useColorScheme';
import { OfflineStatusBanner } from '@/components/OfflineStatusBanner';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
    ...Ionicons.font,
  });

  usePushNotifications();

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      LogBox.ignoreLogs([
        'Sending `onAnimatedValueUpdate` with no listeners registered.',
      ]);
      SplashScreen.hideAsync?.().catch(() => {});
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  return (
    <AppearanceProvider>
      <LocaleProvider>
        <RootLayoutNavThemed />
      </LocaleProvider>
    </AppearanceProvider>
  );
}

const RyxLightNavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#071d3d',
    background: '#f8fafc',
    card: '#ffffff',
    text: '#0f172a',
    border: 'rgba(0,0,0,0.06)',
  },
};

const RyxDarkNavTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#60a5fa',
    background: '#0f172a',
    card: '#1e293b',
    text: '#f1f5f9',
    border: 'rgba(255,255,255,0.08)',
  },
};

function RootLayoutNavThemed() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? RyxDarkNavTheme : RyxLightNavTheme}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <OfflineStatusBanner />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="screen" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
