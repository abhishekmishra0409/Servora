import type { FormEvent } from 'react';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { login } from '../lib/api-client';
import { defaultBranchId, readSession, writeSession } from '../lib/session';

export function LoginPage() {
  const navigate = useNavigate();
  const existingSession = readSession();
  const existingBranchId = defaultBranchId();
  const [email, setEmail] = useState('waiter@harborgrill.test');
  const [password, setPassword] = useState('WaiterPass123!');
  const [branchId, setBranchId] = useState(existingBranchId);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  if (existingSession?.accessToken && existingBranchId) {
    return <Navigate replace to="/tables" />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const session = await login(email, password, branchId || undefined);
      writeSession(session, branchId || session.branchId || '');
      navigate('/tables', { replace: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Login failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="waiter-login-page">
      <section className="waiter-login-shell">
        <div className="waiter-panel waiter-login-hero">
          <div className="waiter-login-hero__content">
            <span className="waiter-chip waiter-chip--active">
              <span className="material-symbols-outlined">room_service</span>
              Floor service
            </span>
            <h1>Run the floor without losing the table.</h1>
            <p>Fast waiter access for table state, pending confirmations, service requests, and bill handoff.</p>
          </div>

          <div className="waiter-login-stats">
            {[
              ['qr_code_2', 'Tables', 'Live table and QR context'],
              ['receipt_long', 'Orders', 'Confirm new orders fast'],
              ['notifications_active', 'Requests', 'Resolve guest calls'],
            ].map(([icon, label, description]) => (
              <div className="waiter-login-stat" key={label}>
                <span className="material-symbols-outlined">{icon}</span>
                <strong>{label}</strong>
                <span className="text-sm text-on-surface-variant">{description}</span>
              </div>
            ))}
          </div>
        </div>

        <form className="waiter-panel waiter-form waiter-login-card" onSubmit={handleSubmit}>
          <div>
            <h2>Waiter login</h2>
            <p>Use the seeded waiter account or your branch credentials.</p>
          </div>

          <div className="waiter-login-card__hint">
            Seed account: waiter@harborgrill.test / WaiterPass123!. Branch ID can stay blank for this account.
          </div>

          <label>
            Email
            <div className="relative">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline">
                badge
              </span>
              <input
                autoComplete="email"
                className="pl-11"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </div>
          </label>

          <label>
            Password
            <div className="relative">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline">
                lock
              </span>
              <input
                autoComplete="current-password"
                className="pl-11 pr-12"
                onChange={(event) => setPassword(event.target.value)}
                required
                type={showPassword ? 'text' : 'password'}
                value={password}
              />
              <button
                className="waiter-icon-button absolute right-1 top-1/2 -translate-y-1/2"
                onClick={() => setShowPassword((value) => !value)}
                type="button"
              >
                <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </label>

          <label>
            Branch ID
            <div className="relative">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline">
                store
              </span>
              <input
                className="pl-11"
                onChange={(event) => setBranchId(event.target.value)}
                placeholder="Optional if user has one branch"
                value={branchId}
              />
            </div>
          </label>

          <button className="waiter-primary-button w-full" disabled={busy} type="submit">
            <span className={`material-symbols-outlined${busy ? ' animate-spin' : ''}`}>
              {busy ? 'progress_activity' : 'login'}
            </span>
            {busy ? 'Signing in' : 'Sign in'}
          </button>

          {message ? <p className="waiter-notice">{message}</p> : null}
        </form>
      </section>
    </main>
  );
}
