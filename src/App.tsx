import { useEffect, useState } from 'react';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { isNative, isDesktopViewport } from '@/utils/platform';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { AuthRouter } from '@/auth/AuthRouter';
import { MobileShell } from '@/screens/mobile/MobileShell';
import { DesktopShell } from '@/screens/desktop/DesktopShell';

function MobileFrame({ children }: { children: React.ReactNode }) {
  // Phone-shaped preview frame for the web target; bypassed on native shells.
  if (isNative()) document.documentElement.classList.add('is-native');
  return <div className="preview-root"><div className="iphone-frame app">{children}</div></div>;
}

function DesktopAuthFrame({ children }: { children: React.ReactNode }) {
  // Full-bleed centered auth on desktop (no iPhone frame).
  return (
    <div className="dt-auth-wrap app">
      <div className="dt-auth-card">
        {children}
      </div>
    </div>
  );
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

  if (loading) {
    return desktop
      ? <DesktopAuthFrame><div style={{ padding: 40, color: 'var(--text-3)' }}>Loading…</div></DesktopAuthFrame>
      : <MobileFrame><div style={{ padding: 60, color: 'var(--text-3)' }}>Loading…</div></MobileFrame>;
  }

  if (!user) {
    return desktop
      ? <DesktopAuthFrame><AuthRouter /></DesktopAuthFrame>
      : <MobileFrame><AuthRouter /></MobileFrame>;
  }

  // Desktop = three-column layout (web ≥ 1024px or macOS shell)
  if (desktop) return <DesktopShell />;
  return <MobileFrame><MobileShell /></MobileFrame>;
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
