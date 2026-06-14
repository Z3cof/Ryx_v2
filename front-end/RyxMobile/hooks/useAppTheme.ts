import { useMemo } from 'react';
import { useAppearance } from '@/contexts/AppearanceContext';
import theme, { getUi } from '@/theme';

export function useAppTheme() {
  const { preference, setPreference, resolvedScheme, hydrated } = useAppearance();
  const isDark = resolvedScheme === 'dark';
  const ui = getUi(resolvedScheme);

  /** primary.bg / teintes adaptées au mode (évite les pastels illisibles en sombre). */
  const primary = useMemo(
    () => ({
      ...theme.colors.primary,
      bg: ui.primaryTintBg,
      tintText: ui.primaryTintText,
      tintBorder: ui.primaryTintBorder,
      link: ui.link,
    }),
    [ui]
  );

  return {
    preference,
    setPreference,
    resolvedScheme,
    isDark,
    hydrated,
    ui,
    colors: theme.colors,
    primary,
    spacing: theme.spacing,
    radius: theme.radius,
    fontSize: theme.fontSize,
  };
}
