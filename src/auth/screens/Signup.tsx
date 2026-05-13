import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { LogoTile } from '@/components/brand/Logo';

export function Signup({ onNav }: { onNav: (k: 'login') => void }) {
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    try { await signup(email, password, name); }
    catch (ex: any) { setErr(ex?.body?.error ?? ex?.message ?? 'Sign-up failed'); }
    finally { setBusy(false); }
  };

  return (
    <div className="auth-shell">
      <LogoTile size={72} />
      <div className="auth-title">Create account</div>
      <div className="auth-sub">Start tracking in under a minute.</div>

      <form className="auth-form" onSubmit={submit}>
        <div className="field"><label>Name</label><input value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div className="field"><label>Email</label><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div className="field"><label>Password · 8+ chars, include a number</label><input type="password" autoComplete="new-password" value={password} minLength={8} onChange={(e) => setPassword(e.target.value)} required /></div>
        {err && <div className="auth-error">{err}</div>}
        <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>By continuing you agree to the Terms and Privacy policy.</div>
        <button type="submit" className="btn primary lg" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
        <div className="row" style={{ marginTop: 16, justifyContent: 'center' }}>
          <span style={{ color: 'var(--text-3)' }}>Already have an account?</span>
          <button type="button" className="auth-link" onClick={() => onNav('login')}>Log in</button>
        </div>
      </form>
    </div>
  );
}
