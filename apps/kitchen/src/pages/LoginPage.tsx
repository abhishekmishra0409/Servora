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

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      const session = await login(email.trim(), password, branchId.trim() || undefined);
      writeSession(session, branchId.trim() || session.branchId || '');
      navigate('/board', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="kitchen-login-page">
      <section className="kitchen-login-shell" aria-labelledby="kitchen-login-title">
        <aside className="kitchen-login-hero" aria-hidden="true">
          <div className="kitchen-login-hero__top">
            <div className="kitchen-login-brand-mark">
              <span className="material-symbols-outlined filled">soup_kitchen</span>
            </div>
            <span>Restaurent Kitchen</span>
          </div>
          <div className="kitchen-login-hero__content">
            <p className="kitchen-login-eyebrow">Kitchen Display System</p>
            <h1>Tickets, timing, and stations in one live board.</h1>
          </div>
          <div className="kitchen-login-signals">
            <span><span className="material-symbols-outlined">receipt_long</span>New tickets</span>
            <span><span className="material-symbols-outlined">timer</span>Rush timing</span>
            <span><span className="material-symbols-outlined">room_service</span>Ready handoff</span>
          </div>
        </aside>

        <section className="kitchen-login-card">
          <header className="kitchen-login-card__header">
            <div className="kitchen-login-role">
              <span className="material-symbols-outlined filled" aria-hidden="true">soup_kitchen</span>
              Kitchen staff access
            </div>
            <h2 id="kitchen-login-title">Sign in to the kitchen board</h2>
            <p>Use a kitchen role account assigned to this branch.</p>
          </header>

          {error ? (
            <div className="kitchen-login-alert" role="alert" aria-live="assertive">
              <span className="material-symbols-outlined" aria-hidden="true">error</span>
              <p>{error}</p>
            </div>
          ) : null}

          <form className="kitchen-login-form" onSubmit={handleSubmit}>
            <label className="kitchen-login-field" htmlFor="email">
              <span>Email</span>
              <span className="kitchen-login-input">
                <span className="material-symbols-outlined" aria-hidden="true">badge</span>
                <input
                  autoComplete="email"
                  autoFocus
                  id="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="kitchen@harborgrill.com"
                  required
                  type="email"
                  value={email}
                />
              </span>
            </label>

            <label className="kitchen-login-field" htmlFor="password">
              <span>Password</span>
              <span className="kitchen-login-input">
                <span className="material-symbols-outlined" aria-hidden="true">lock</span>
                <input
                  autoComplete="current-password"
                  id="password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter password"
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                />
                <button
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="kitchen-login-icon-button"
                  onClick={() => setShowPassword((current) => !current)}
                  type="button"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </span>
            </label>

            <label className="kitchen-login-field" htmlFor="branchId">
              <span>Branch ID <small>Optional</small></span>
              <span className="kitchen-login-input">
                <span className="material-symbols-outlined" aria-hidden="true">storefront</span>
                <input
                  autoComplete="off"
                  id="branchId"
                  onChange={(event) => setBranchId(event.target.value)}
                  placeholder="Use saved branch if available"
                  type="text"
                  value={branchId}
                />
              </span>
            </label>

            <button className="kitchen-login-submit" disabled={busy} type="submit">
              <span className="material-symbols-outlined" aria-hidden="true">
                {busy ? 'progress_activity' : 'login'}
              </span>
              {busy ? 'Signing in...' : 'Open kitchen board'}
            </button>
          </form>

          <footer className="kitchen-login-footer">
            Need access? Ask a manager to assign the Kitchen role for this branch.
          </footer>
        </section>
      </section>
    </main>
  );
}
