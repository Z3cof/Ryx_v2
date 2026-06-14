/**
 * Thème style Tailwind : couleurs, espacements, radius
 * Utiliser dans StyleSheet pour un rendu cohérent.
 */
export const colors = {
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
  sky: {
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
  },
  blue: {
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    50: '#eff6ff',
    100: '#dbeafe',
    cyan: '#00c6ff',
  },
  // Couleur principale Ryx (bleu logo)
  primary: {
    main: '#071d3d',
    light: '#3b82f6',
    dark: '#1d4ed8',
    bg: '#eff6ff',
  },
  // Conservé pour compatibilité
  green: {
    dark: '#0f2e1e',
    darker: '#0a1f14',
    lime: '#a3e635',
    limeBright: '#84cc16',
  },
  white: '#ffffff',
  black: '#000000',
};

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  14: 56,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 999,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 22,
};

/**
 * Couleurs d’interface selon le mode (clair / sombre).
 * @param {'light' | 'dark'} scheme
 */
export function getUi(scheme) {
  if (scheme === 'dark') {
    return {
      background: '#0f172a',
      surface: '#1e293b',
      surfaceMuted: '#334155',
      textPrimary: '#f1f5f9',
      textSecondary: '#94a3b8',
      textTertiary: '#64748b',
      textTitle: '#e2e8f0',
      border: 'rgba(255,255,255,0.08)',
      rowPressed: 'rgba(255,255,255,0.06)',
      navPillBg: 'rgba(30,41,59,0.94)',
      navBorder: 'rgba(255,255,255,0.1)',
      gradient: ['#0f172a', '#1e293b', '#1e293b'],
      /** Fond dégradé multi-arrêts (écrans type accueil) */
      gradientSoft: ['#1e293b', '#0f172a', '#0f172a', '#0c1222'],
      iconMuted: '#94a3b8',
      iconActive: '#f1f5f9',
      onPrimaryText: '#ffffff',
      /** Contenu de la barre de statut (prop Expo StatusBar `style`) */
      statusBar: 'light',
      /** Fonds/icônes teintés « primaire » (remplace primary.bg en clair) */
      primaryTintBg: 'rgba(59, 130, 246, 0.18)',
      primaryTintText: '#93c5fd',
      primaryTintBorder: 'rgba(96, 165, 250, 0.35)',
      /** Liens et libellés actifs sur fond sombre */
      link: colors.blue[400],
      income: '#34d399',
      expense: '#f87171',
      accent: '#fbbf24',
      donutShellBg: 'rgba(30, 41, 59, 0.85)',
      donutShellBorder: 'rgba(255,255,255,0.1)',
      ringBadgeBg: '#334155',
    };
  }
  return {
    background: '#f8fafc',
    surface: '#ffffff',
    surfaceMuted: '#f8fafc',
    textPrimary: colors.slate[900],
    textSecondary: colors.slate[500],
    textTertiary: colors.slate[400],
    textTitle: colors.slate[800],
    border: 'rgba(0,0,0,0.06)',
    rowPressed: colors.slate[50],
    navPillBg: 'rgba(255,255,255,0.92)',
    navBorder: 'rgba(0,0,0,0.06)',
    gradient: ['#eff6ff', '#f8fafc', '#f8fafc'],
    gradientSoft: ['#dbeafe', '#eff6ff', '#f0f9ff', '#f8fafc'],
    iconMuted: colors.slate[400],
    iconActive: colors.slate[900],
    onPrimaryText: colors.white,
    statusBar: 'dark',
    primaryTintBg: colors.primary.bg,
    primaryTintText: colors.primary.dark,
    primaryTintBorder: 'rgba(37, 99, 235, 0.25)',
    link: colors.primary.main,
    income: '#059669',
    expense: '#dc2626',
    accent: '#f59e0b',
    donutShellBg: 'rgba(255,255,255,0.38)',
    donutShellBorder: 'rgba(255,255,255,0.72)',
    ringBadgeBg: colors.white,
  };
}

export default { colors, spacing, radius, fontSize, getUi };
