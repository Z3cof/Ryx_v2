import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform, useColorScheme as useSystemColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@ryx/appearance-preference';

function storageGetItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    try {
      return Promise.resolve(localStorage.getItem(key));
    } catch {
      return Promise.resolve(null);
    }
  }
  return AsyncStorage.getItem(key).catch(() => null);
}

function storageSetItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
    return Promise.resolve();
  }
  return AsyncStorage.setItem(key, value).catch(() => {});
}

export type AppearancePreference = 'light' | 'dark' | 'system';

type AppearanceContextValue = {
  preference: AppearancePreference;
  setPreference: (value: AppearancePreference) => Promise<void>;
  resolvedScheme: 'light' | 'dark';
  hydrated: boolean;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<AppearancePreference>('system');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await storageGetItem(STORAGE_KEY);
        if (!cancelled && (raw === 'light' || raw === 'dark' || raw === 'system')) {
          setPreferenceState(raw);
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = useCallback(async (value: AppearancePreference) => {
    setPreferenceState(value);
    try {
      await storageSetItem(STORAGE_KEY, value);
    } catch {
      /* pas de persistance : le thème reste actif pour la session */
    }
  }, []);

  const resolvedScheme = useMemo<'light' | 'dark'>(() => {
    if (preference === 'system') {
      return systemScheme === 'dark' ? 'dark' : 'light';
    }
    return preference;
  }, [preference, systemScheme]);

  const value = useMemo(
    () => ({
      preference,
      setPreference,
      resolvedScheme,
      hydrated,
    }),
    [preference, setPreference, resolvedScheme, hydrated]
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance(): AppearanceContextValue {
  const ctx = useContext(AppearanceContext);
  if (!ctx) {
    throw new Error('useAppearance doit être utilisé sous AppearanceProvider');
  }
  return ctx;
}
