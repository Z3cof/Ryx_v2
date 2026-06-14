import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

const STORAGE_KEY = '@ryx/locale-preference';

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

export type LanguagePreference = 'fr' | 'en' | 'system';

export type ResolvedLocale = 'fr' | 'en';

function readDeviceLanguageCode(): string {
  try {
    return (Localization.getLocales()[0]?.languageCode ?? 'fr').toLowerCase();
  } catch {
    return 'fr';
  }
}

export function resolveAppLocale(
  pref: LanguagePreference,
  deviceCode: string
): ResolvedLocale {
  if (pref === 'system') {
    if (deviceCode.startsWith('en')) return 'en';
    return 'fr';
  }
  return pref;
}

type LocaleContextValue = {
  languagePreference: LanguagePreference;
  setLanguagePreference: (value: LanguagePreference) => Promise<void>;
  resolvedLocale: ResolvedLocale;
  deviceLanguageCode: string;
  hydrated: boolean;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [languagePreference, setLanguagePreferenceState] =
    useState<LanguagePreference>('system');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await storageGetItem(STORAGE_KEY);
        if (!cancelled && (raw === 'fr' || raw === 'en' || raw === 'system')) {
          setLanguagePreferenceState(raw);
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguagePreference = useCallback(async (value: LanguagePreference) => {
    setLanguagePreferenceState(value);
    try {
      await storageSetItem(STORAGE_KEY, value);
    } catch {
      /* session only */
    }
  }, []);

  const deviceLanguageCode = readDeviceLanguageCode();
  const resolvedLocale = useMemo(
    () => resolveAppLocale(languagePreference, deviceLanguageCode),
    [languagePreference, deviceLanguageCode]
  );

  const value = useMemo(
    () => ({
      languagePreference,
      setLanguagePreference,
      resolvedLocale,
      deviceLanguageCode,
      hydrated,
    }),
    [
      languagePreference,
      setLanguagePreference,
      resolvedLocale,
      deviceLanguageCode,
      hydrated,
    ]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale doit être utilisé sous LocaleProvider');
  }
  return ctx;
}
