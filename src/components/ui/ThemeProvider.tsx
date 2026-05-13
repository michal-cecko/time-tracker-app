import { useEffect, type ReactNode } from 'react';
import { useTweaks } from '@/state/tweaks';

// Applies the user's accent + theme to the document root. Density is
// hardcoded to "comfy" and font scale to 100% — those used to be tweakable
// but the user opted for a single canonical layout instead.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme, accentHex } = useTweaks();

  // Accent — one-shot whenever the user changes it.
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accentHex);
  }, [accentHex]);

  // Density / font-scale are fixed. Apply once and never touch again.
  useEffect(() => {
    document.documentElement.classList.remove('density-compact');
    document.documentElement.classList.add('density-comfy');
    document.documentElement.style.fontSize = '16px';
  }, []);

  // Theme: 'dark' / 'bright' apply directly; 'system' follows the OS via a
  // matchMedia listener so toggling iOS dark/light updates the app live.
  useEffect(() => {
    if (theme !== 'system') {
      document.documentElement.classList.toggle('theme-light', theme === 'bright');
      return;
    }
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const apply = () => document.documentElement.classList.toggle('theme-light', mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  return <>{children}</>;
}
