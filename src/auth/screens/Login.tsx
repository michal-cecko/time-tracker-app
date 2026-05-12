import { useState } from 'react';
import { useAuth } from '../AuthContext';

export function Login({ onNav }: { onNav: (k: 'signup' | 'forgot') => void }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('alex@studio.co');
  const [password, setPassword] = useState('password123');
  const [stay, setStay] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    try { await login(email, password, stay); }
    catch (ex: any) { setErr(ex?.body?.error ?? ex?.message ?? 'Login failed'); }
    finally { setBusy(false); }
  };

  return (
    <div className="auth-shell">
      <div className="auth-logo">L</div>
      <div className="auth-title">Lapse</div>
      <div className="auth-sub">Time, well spent.</div>

      <form className="auth-form" onSubmit={submit}>
        <div className="field">
          <label>Email</label>
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {err && <div className="auth-error">{err}</div>}
        <div className="row">
          <label className={`checkbox ${stay ? 'on' : ''}`}>
            <input type="checkbox" checked={stay} onChange={(e) => setStay(e.target.checked)} />
            <span className="box">{stay && '✓'}</span>
            Stay logged in
          </label>
          <button type="button" className="auth-link" onClick={() => onNav('forgot')}>Forgot?</button>
        </div>
        <button type="submit" className="btn primary lg" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        <div className="row" style={{ marginTop: 16, justifyContent: 'center' }}>
          <span style={{ color: 'var(--text-3)' }}>New to Lapse?</span>
          <button type="button" className="auth-link" onClick={() => onNav('signup')}>Create account</button>
        </div>
      </form>
    </div>
  );
}
