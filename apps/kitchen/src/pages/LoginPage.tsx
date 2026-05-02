import type { FormEvent } from 'react';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { login } from '../lib/api-client';
import { defaultBranchId, readSession, writeSession } from '../lib/session';

export function LoginPage() {
  const navigate = useNavigate();
  const existingSession = readSession();
  const existingBranchId = defaultBranchId();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [branchId, setBranchId] = useState(existingBranchId);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (existingSession?.accessToken && existingBranchId) {
    return <Navigate replace to="/board" />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const session = await login(email, password, branchId || undefined);
      writeSession(session, branchId || session.branchId || '');
      navigate('/board', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setBusy(false);
    }
  }

  const inputStyle = {
    paddingLeft: 44, paddingRight: 16, paddingTop: 14, paddingBottom: 14,
    border: '1px solid #dbc2b0', background: '#ffffff', fontSize: 15, color: '#111c2d',
    width: '100%', borderRadius: 8, outline: 'none',
  };
  const focusStyle = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = '#8d4b00';
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(141,75,0,0.1)';
  };
  const blurStyle = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = '#dbc2b0';
    e.currentTarget.style.boxShadow = 'none';
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, position: 'relative' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '33%', background: 'linear-gradient(to bottom, rgba(141,75,0,0.06), transparent)', pointerEvents: 'none', zIndex: -1 }} />
      <main style={{ width: '100%', maxWidth: 420, background: '#ffffff', borderRadius: 16, border: '1px solid rgba(219,194,176,0.3)', boxShadow: '0 8px 40px rgba(0,0,0,0.08)', padding: 40, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Header */}
        <header style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#b15f00', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 30, color: '#fff', fontVariationSettings: "'FILL' 1" }}>soup_kitchen</span>
          </div>
          <h1 style={{ fontSize: 32, lineHeight: '40px', fontWeight: 900, color: '#8d4b00', margin: 0 }}>Kitchen</h1>
          <p style={{ fontSize: 14, color: '#554336', margin: 0 }}>Display System — Staff Access</p>
        </header>

        {/* Role Toggle */}
        <div style={{ display: 'flex', background: '#f0f3ff', borderRadius: 8, gap: 4, padding: 4 }}>
          <button type="button" style={{ flex: 1, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '8px 0', color: '#554336', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>concierge</span>FLOOR
          </button>
          <button type="button" style={{ flex: 1, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '8px 0', background: '#fff', border: '1px solid rgba(219,194,176,0.3)', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', color: '#8d4b00', cursor: 'pointer', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>soup_kitchen</span>KITCHEN
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: '#ffdad6', color: '#93000a', borderRadius: 8, padding: '12px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, flexShrink: 0 }}>error</span>
            <p style={{ margin: 0, fontSize: 13 }}>{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="email" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', color: '#554336' }}>EMAIL</label>
            <div style={{ position: 'relative' }}>
              <span className="material-symbols-outlined" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 20, color: '#887364', pointerEvents: 'none' }}>badge</span>
              <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="kitchen@harborgrill.com" style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="password" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', color: '#554336' }}>PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <span className="material-symbols-outlined" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 20, color: '#887364', pointerEvents: 'none' }}>lock</span>
              <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={{ ...inputStyle, paddingRight: 48 }} onFocus={focusStyle} onBlur={blurStyle} />
              <button type="button" onClick={() => setShowPassword(v => !v)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#887364', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{showPassword ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="branchId" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', color: '#554336' }}>
              BRANCH ID <span style={{ fontWeight: 400, color: '#887364' }}>(optional)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <span className="material-symbols-outlined" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 20, color: '#887364', pointerEvents: 'none' }}>store</span>
              <input id="branchId" type="text" value={branchId} onChange={(e) => setBranchId(e.target.value)} placeholder="Leave blank if auto-detected" style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
            </div>
          </div>

          <button type="submit" disabled={busy} style={{ marginTop: 8, padding: '16px', background: busy ? '#b5895c' : '#8d4b00', color: '#ffffff', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', boxShadow: '0 4px 14px rgba(141,75,0,0.3)', cursor: busy ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{busy ? 'progress_activity' : 'login'}</span>
            {busy ? 'Signing In…' : 'Sign In'}
          </button>
        </form>

        <footer style={{ textAlign: 'center' }}>
          <button type="button" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#515f74', background: 'none', border: 'none', cursor: 'pointer' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>help</span>
            Need manager override?
          </button>
        </footer>
      </main>
    </div>
  );
}
