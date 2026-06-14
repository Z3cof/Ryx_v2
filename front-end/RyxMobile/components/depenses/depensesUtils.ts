import { LayoutAnimation, Platform, UIManager } from 'react-native';

export const GRID_PADDING = 20;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function animateLayoutEase() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

export function parseAmountFromDisplay(raw: unknown): number | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  const cleaned = s
    .replace(/\s/g, '')
    .replace(/[^\d,.\-]/g, '')
    .replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? Math.abs(n) : null;
}
