import { useEffect, type ReactNode } from 'react';
import { useTweaks } from '@/state/tweaks';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme, accentHex, density, fontScale } = useTweaks();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('theme-light', theme === 'bright');
    root.classList.toggle('density-compact', density === 'compact');
    root.classList.toggle('density-comfy', density === 'comfy');
    root.style.setProperty('--accent', accentHex);
    root.style.fontSize = `${fontScale * 16}px`;
  }, [theme, accentHex, density, fontScale]);

  return <>{children}</>;
}
