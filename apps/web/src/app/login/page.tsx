'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { loginStaff } from '../../lib/api-client';
import { readCmsSettings, writeCmsSettings } from '../../lib/cms-storage';

export default function CmsLoginPage() {
  const router = useRouter();
  const [branchId, setBranchId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'error' | 'success'>('error');

  useEffect(() => {
    const settings = readCmsSettings();
    setBranchId(settings.branchId);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setMessage('');

    try {
      const session = await loginStaff(email.trim(), password, branchId.trim() || undefined);
      const nextBranchId = session.branchId || branchId.trim();

      if (!nextBranchId) {
        setMessageTone('error');
        setMessage('Signed in, but no branch ID was returned for this account.');
        return;
      }

      writeCmsSettings(nextBranchId, session.accessToken, session.tenantId, session.refreshToken);
      setMessageTone('success');
      setMessage('Signed in.');
      router.push('/dashboard');
    } catch (error) {
      setMessageTone('error');
      setMessage(error instanceof Error ? error.message : 'Login failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-login">
      <section className="admin-login__media" aria-label="Restaurant operations workspace">
        <img
          alt="Restaurant dining room and service counter ready for operations"
          className="admin-login__image"
          src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=80"
        />
        <div className="admin-login__shade" />
        <div className="admin-login__status-strip" aria-hidden="true">
          <span><span className="material-symbols-outlined">receipt_long</span>Live orders</span>
          <span><span className="material-symbols-outlined">table_restaurant</span>Tables</span>
          <span><span className="material-symbols-outlined">monitoring</span>Reports</span>
        </div>
        <aside className="admin-login__callout">
          <div className="admin-login__callout-icon" aria-hidden="true">
            <span className="material-symbols-outlined">shield_person</span>
          </div>
          <div>
            <h2>Secure branch control</h2>
            <p>Orders, tables, staff, billing, and audit logs stay scoped to the signed-in team.</p>
          </div>
        </aside>
      </section>

      <section className="admin-login__panel" aria-labelledby="admin-login-title">
        <div className="admin-login__form-wrap">
          <header className="admin-login__header">
            <div className="admin-login__brand">
              <div className="admin-login__brand-icon" aria-hidden="true">
                <span className="material-symbols-outlined">restaurant</span>
              </div>
              <span>Restaurent</span>
            </div>
            <h1 id="admin-login-title">Admin Portal</h1>
            <p>Sign in with an owner or manager account to manage branch operations.</p>
          </header>

          <form className="admin-login__form" onSubmit={handleSubmit}>
            <label className="admin-login__field">
              <span>Email Address</span>
              <span className="admin-login__input-wrap">
                <span className="material-symbols-outlined" aria-hidden="true">alternate_email</span>
                <input
                  autoComplete="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="manager@restaurent.com"
                  required
                  type="email"
                  value={email}
                />
              </span>
            </label>

            <label className="admin-login__field">
              <span>Password</span>
              <span className="admin-login__input-wrap">
                <span className="material-symbols-outlined" aria-hidden="true">lock</span>
                <input
                  autoComplete="current-password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter password"
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                />
                <button
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="admin-login__icon-button"
                  onClick={() => setShowPassword((current) => !current)}
                  type="button"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </span>
            </label>


            <div className="admin-login__options">
              <span className="admin-login__device-note">Session stored on this device</span>
              <a href="mailto:support@restaurent.com">Forgot password?</a>
            </div>

            <button className="admin-login__submit" disabled={busy} type="submit">
              <span className="material-symbols-outlined" aria-hidden="true">
                {busy ? 'progress_activity' : 'login'}
              </span>
              {busy ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {message ? <p className={`admin-login__message admin-login__message--${messageTone}`}>{message}</p> : null}

          <footer className="admin-login__support">
            <p>
              Need access for a new branch? <a href="mailto:support@restaurent.com">Contact support</a>
            </p>
          </footer>
        </div>
      </section>
    </main>
  );
}
