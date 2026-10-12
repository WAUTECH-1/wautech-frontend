import { useEffect, useState } from 'react';
import { readPreference, resolveTheme, savePreference } from './preferences';
import type { Theme } from './contracts';
export function useDashboardTheme(
  initialTheme: Theme = 'Midnight Glass',
  preferenceKey = 'wautech',
) {
  const [theme, setTheme] = useState<Theme>(() =>
    resolveTheme(readPreference(preferenceKey + '-theme', initialTheme)),
  );
  useEffect(() => {
    savePreference(preferenceKey + '-theme', theme);
  }, [theme, preferenceKey]);
  return { theme, setTheme };
}
