import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/api/client';
import type { Settings, User } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { useTweaks, type Theme } from '@/state/tweaks';

const ACCENT_OPTIONS = ['#FF7A45', '#4A7EFF', '#34C270', '#A464D9', '#E5B341', '#E54336'];

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const [me, setMe] = useState<(User & { settings: Settings }) | null>(null);
  const { logout } = useAuth();
  const tweaks = useTweaks();

  useEffect(() => { (async () => setMe(await api('/me')))(); }, []);

  const patch = async (p: Partial<Settings>) => {
    await api('/me/settings', { method: 'PATCH', body: p });
    setMe((m) => m ? { ...m, settings: { ...m.settings, ...p } } : m);
  };

  // Local-first appearance writes — flip the UI instantly via tweaks store
  // and persist to the server in the background.
  const changeTheme = async (t: Theme) => {
    tweaks.set({ theme: t });
    try { await patch({ theme: t }); } catch {}
  };
  const changeAccent = async (hex: string) => {
    tweaks.set({ accentHex: hex });
    try { await patch({ accentHex: hex }); } catch {}
  };

  if (!me) return <div className="scroll" style={{ padding: 60 }}>Loading…</div>;
  const s = me.settings;

  return (
    <>
      <div className="app-header">
        <button className="icon-btn" onClick={onBack} aria-label="Back"><Icon.ChevronLeft /></button>
        <div><div className="title">Settings</div></div>
        <span className="spacer" />
      </div>

      <div className="scroll">
        <div className="section">
          <div className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 16,
              background: 'linear-gradient(135deg, var(--accent), #c84d22)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(0,0,0,0.78)', fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 20,
            }}>{me.avatarSeed}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{me.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{me.email} · {me.plan}</div>
            </div>
          </div>
        </div>

        <div className="section">
          <div className="section-head"><span>Appearance</span></div>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 10.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 8 }}>Theme</div>
            <div className="hstack" style={{ gap: 6 }}>
              {(['dark', 'bright', 'system'] as Theme[]).map((t) => (
                <button
                  key={t}
                  className="seg-btn"
                  onClick={() => changeTheme(t)}
                  style={{
                    flex: 1, height: 36,
                    background: tweaks.theme === t ? 'var(--accent-tint)' : 'var(--bg-elev-2)',
                    color: tweaks.theme === t ? 'var(--accent)' : 'var(--text-2)',
                    borderRadius: 10, fontSize: 13, fontWeight: 500,
                  }}
                >
                  {t === 'dark' ? 'Dark' : t === 'bright' ? 'Bright' : 'System'}
                </button>
              ))}
            </div>

            <div style={{ fontSize: 10.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, margin: '18px 0 8px' }}>Accent</div>
            <div className="hstack" style={{ gap: 10 }}>
              {ACCENT_OPTIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => changeAccent(c)}
                  style={{
                    width: 32, height: 32, borderRadius: 10, background: c, border: 0,
                    outline: c.toLowerCase() === tweaks.accentHex.toLowerCase() ? '2px solid var(--text)' : '2px solid transparent',
                    outlineOffset: c.toLowerCase() === tweaks.accentHex.toLowerCase() ? 2 : 0,
                  }}
                  aria-label={`Accent ${c}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="section">
          <div className="section-head"><span>Tracking</span></div>
          <div className="card">
            <SettingRow label="Idle detection" value={`${s.idleDetectionMin}m`} onChange={(v) => patch({ idleDetectionMin: Number(v) })} numeric />
            <SettingToggle label="Auto-stop at midnight" value={s.autoStopAtMidnight} onChange={(v) => patch({ autoStopAtMidnight: v })} />
            <SettingToggle label="Pomodoro mode" value={s.pomodoroEnabled} onChange={(v) => patch({ pomodoroEnabled: v })} />
            <SettingToggle label="Reminders" value={s.remindersEnabled} onChange={(v) => patch({ remindersEnabled: v })} />
          </div>
        </div>

        <div className="section">
          <div className="section-head"><span>Sync</span></div>
          <div className="card">
            <SettingRow label="Status" value="All synced" />
            <SettingToggle label="Calendar integration" value={s.calendarIntegration} onChange={(v) => patch({ calendarIntegration: v })} />
            <div className="task" onClick={() => alert('Export TBD')}>
              <div className="grow"><div className="title-line">Export data</div></div>
              <Icon.ChevronRight size={14} />
            </div>
          </div>
        </div>

        <div className="section">
          <div className="section-head"><span>About</span></div>
          <div className="card">
            <SettingRow label="Version" value="0.1.0" />
            <div className="task" onClick={() => alert('Help TBD')}>
              <div className="grow"><div className="title-line">Help & support</div></div>
              <Icon.ChevronRight size={14} />
            </div>
            <div className="task" onClick={logout} style={{ color: 'var(--pri-urgent)' }}>
              <div className="grow"><div className="title-line" style={{ color: 'var(--pri-urgent)' }}>Sign out</div></div>
            </div>
          </div>
        </div>
        <div style={{ height: 120 }} />
      </div>
    </>
  );
}

function SettingRow({ label, value, onChange, numeric }: { label: string; value: string | number; onChange?: (v: string) => void; numeric?: boolean }) {
  if (onChange) {
    return (
      <div className="task" style={{ minHeight: 48 }}>
        <div className="grow"><div className="title-line">{label}</div></div>
        <input
          type={numeric ? 'number' : 'text'}
          value={String(value).replace('m', '')}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: 60, textAlign: 'right', background: 'var(--bg-elev-2)', borderRadius: 6, padding: '4px 8px' }}
        />
      </div>
    );
  }
  return (
    <div className="task" style={{ minHeight: 48 }}>
      <div className="grow"><div className="title-line">{label}</div></div>
      <span className="muted">{value}</span>
    </div>
  );
}

function SettingToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="task" style={{ minHeight: 48 }} onClick={() => onChange(!value)}>
      <div className="grow"><div className="title-line">{label}</div></div>
      <span style={{
        width: 36, height: 22, borderRadius: 999,
        background: value ? 'var(--accent)' : 'var(--bg-elev-2)',
        position: 'relative', transition: 'background .15s',
      }}>
        <span style={{
          position: 'absolute', top: 2, left: value ? 16 : 2,
          width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .15s',
        }} />
      </span>
    </div>
  );
}
