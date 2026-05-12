import { useEffect } from 'react';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { isNative, isDesktopViewport } from '@/utils/platform';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { AuthRouter } from '@/auth/AuthRouter';
import { MobileShell } from '@/screens/mobile/MobileShell';
import { DesktopShell } from '@/screens/desktop/DesktopShell';
import { useState } from 'react';

function Frame({ children }: { children: React.ReactNode }) {
  // Native shells (Capacitor / Tauri) bypass the iPhone preview frame.
  if (isNative()) {
    document.documentElement.classList.add('is-native');
    return <div className="preview-root"><div className="iphone-frame app">{children}</div></div>;
  }
  return <div className="preview-root"><div className="iphone-frame app">{children}</div></div>;
}

function Routed() {
  const { user, loading } = useAuth();
  const [desktop, setDesktop] = useState(isDesktopViewport());

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const fn = () => setDesktop(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  if (loading) return <Frame><div style={{ padding: 60, color: 'var(--text-3)' }}>Loading…</div></Frame>;
  if (!user) return <Frame><AuthRouter /></Frame>;

  // Desktop = three-column layout (web ≥ 1024px or macOS shell)
  if (desktop) return <DesktopShell />;
  return <Frame><MobileShell /></Frame>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routed />
      </AuthProvider>
    </ThemeProvider>
  );
}
