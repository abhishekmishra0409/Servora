'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { loginStaff } from '../../lib/api-client';
import { readCmsSettings, writeCmsSettings } from '../../lib/cms-storage';

const staffRoles = ['Owner', 'Manager', 'Waiter', 'Kitchen', 'Cashier'];

export default function StaffLoginPage() {
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
      const platformRole = ['super_admin', 'platform_admin'].includes(session.role);

      if (!nextBranchId && !platformRole) {
        setMessageTone('error');
        setMessage('Signed in, but no branch ID was returned for this account.');
        return;
      }

      writeCmsSettings(
        nextBranchId,
        session.accessToken,
        session.tenantId,
        session.refreshToken,
        session.role,
        session.userId,
      );
      setMessageTone('success');
      setMessage('Signed in.');
      router.push(platformRole ? '/super-admin' : '/dashboard');
    } catch (error) {
      setMessageTone('error');
      setMessage(error instanceof Error ? error.message : 'Login failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-login">
      <section className="admin-login__media" aria-label="Restaurant staff workspace">
        <img
          alt="Restaurant dining room and service counter ready for operations"
          className="admin-login__image"
          src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=80"
        />
        <div className="admin-login__shade" />
        <div className="admin-login__status-strip" aria-hidden="true">
          <span><span className="material-symbols-outlined">receipt_long</span>Orders</span>
          <span><span className="material-symbols-outlined">soup_kitchen</span>Kitchen</span>
          <span><span className="material-symbols-outlined">payments</span>Bills</span>
        </div>
        <aside className="admin-login__callout">
          <div className="admin-login__callout-icon" aria-hidden="true">
            <span className="material-symbols-outlined">groups</span>
          </div>
          <div>
            <h2>One workspace for every role</h2>
            <p>Each team member signs in here and sees the dashboard, actions, and sidebar made for their role.</p>
          </div>
        </aside>
      </section>

      <section className="admin-login__panel" aria-labelledby="staff-login-title">
        <div className="admin-login__form-wrap">
          <header className="admin-login__header">
            <div className="admin-login__brand">
              <div className="admin-login__brand-icon" aria-hidden="true">
                <span className="material-symbols-outlined">restaurant</span>
              </div>
              <span>Restaurent</span>
            </div>
            <h1 id="staff-login-title">Staff Sign In</h1>
            <p>Use the same login for platform, owner, manager, waiter, kitchen, and cashier access.</p>
            <div className="admin-login__role-strip" aria-label="Supported staff roles">
              {staffRoles.map((role) => (
                <span key={role}>{role}</span>
              ))}
            </div>
          </header>

          <form className="admin-login__form" onSubmit={handleSubmit}>
            <label className="admin-login__field">
              <span>Email Address</span>
              <span className="admin-login__input-wrap">
                <span className="material-symbols-outlined" aria-hidden="true">alternate_email</span>
                <input
                  autoComplete="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@restaurant.com"
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

            <label className="admin-login__field">
              <span>Branch ID <small>Optional for single-branch staff</small></span>
              <span className="admin-login__input-wrap">
                <span className="material-symbols-outlined" aria-hidden="true">storefront</span>
                <input
                  autoComplete="off"
                  onChange={(event) => setBranchId(event.target.value)}
                  placeholder="Leave blank for seeded demo users"
                  type="text"
                  value={branchId}
                />
              </span>
            </label>

            <div className="admin-login__options">
              <span className="admin-login__device-note">Role-based workspace opens after sign in</span>
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
              Need access for a branch or role? <a href="mailto:support@restaurent.com">Contact support</a>
            </p>
          </footer>
        </div>
      </section>
    </main>
  );
}
