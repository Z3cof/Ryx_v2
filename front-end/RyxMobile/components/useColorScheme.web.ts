import { useAppearance } from '@/contexts/AppearanceContext';

export function useColorScheme(): 'light' | 'dark' {
  return useAppearance().resolvedScheme;
}
