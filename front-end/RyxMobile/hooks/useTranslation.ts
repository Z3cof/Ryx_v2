import { useCallback } from 'react';
import { useLocale } from '@/hooks/useLocale';
import { tLocale } from '@/locales/strings';

export function useTranslation() {
  const { resolvedLocale } = useLocale();
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) =>
      tLocale(resolvedLocale, key, vars),
    [resolvedLocale]
  );
  return { t, locale: resolvedLocale };
}
