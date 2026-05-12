// Detect runtime: native (Capacitor/Tauri shell) vs web browser preview.
export function isNative(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as any;
  if (w.Capacitor?.isNativePlatform?.()) return true;
  if (w.__TAURI__ || w.__TAURI_INTERNALS__) return true;
  return false;
}

export type Platform = 'ios' | 'android' | 'macos' | 'web';

export function platform(): Platform {
  const w = window as any;
  if (w.Capacitor?.getPlatform) {
    const p = w.Capacitor.getPlatform();
    if (p === 'ios') return 'ios';
    if (p === 'android') return 'android';
  }
  if (w.__TAURI__ || w.__TAURI_INTERNALS__) return 'macos';
  return 'web';
}

// Desktop layout breakpoint — the prototype's three-column shell only makes
// sense at ≥ 1024px. Below that we render the mobile shell, even on macOS.
export function isDesktopViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(min-width: 1024px)').matches;
}
