'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { loginStaff } from '../../lib/api-client';
import { writeCmsSettings } from '../../lib/cms-storage';

export default function CmsLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setMessage('');

    try {
      const session = await loginStaff(email, password);
      const branchId = session.branchId || '';

      if (!branchId) {
        setMessage('Signed in, but no branch ID was returned for this account.');
        return;
      }

      writeCmsSettings(branchId, session.accessToken, session.tenantId);
      setMessage(remember ? 'Signed in. Session remembered on this device.' : 'Signed in.');
      router.push('/dashboard');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Login failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-login">
      <section className="admin-login__media" aria-label="Restaurant preparation workspace">
        <img
          alt="Organized restaurant kitchen preparation station"
          className="admin-login__image"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuARC1Na07zC3KSPLVXAGt-T4SgcATpo85Dom4Ixges9j_WG1yK7aECXEsgVawXRAG4bnCPHQAIqDWaNFqY6krRNid1cljhOd1Z-ZiJB-CxjUNesKvD0g_heOg8UEZ5dDGw7U4WJ4vPikjzy6hZ2NM4U9mrJsFj_cxsqBM_CT_Xf8NQ1FSZ6_TJOLlAzcHCIXKZiqbkXlFP5ZTPo1bAx2oJ59WJMZ19chutzzVbtdzN0fcwh3ZSQ0SwZOCRtPm8KtzJnlhmNtqGxMRKX"
        />
        <div className="admin-login__shade" />
        <aside className="admin-login__callout">
          <h2>Operational Excellence</h2>
          <p>The tools you need to remain invisible during peak hours while providing absolute clarity.</p>
        </aside>
      </section>

      <section className="admin-login__panel" aria-labelledby="admin-login-title">
        <div className="admin-login__form-wrap">
          <header className="admin-login__header">
            <div className="admin-login__brand">
              <svg
                aria-hidden="true"
                className="admin-login__brand-icon"
                fill="none"
                viewBox="0 0 32 32"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M7 3v12M11 3v12M15 3v12M11 15v14M23 3c-2.7 2.2-4 5.2-4 9.1v5.2h5V29"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                />
              </svg>
              <span>Restaurent</span>
            </div>
            <h1 id="admin-login-title">Admin Portal</h1>
            <p>Welcome back. Please enter your details to access the dashboard.</p>
          </header>

          <form className="admin-login__form" onSubmit={handleSubmit}>
            <label className="admin-login__field">
              <span>Email Address</span>
              <input
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="manager@restaurent.com"
                required
                type="email"
                value={email}
              />
            </label>

            <label className="admin-login__field">
              <span>Password</span>
              <input
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="password"
                required
                type="password"
                value={password}
              />
            </label>

            <div className="admin-login__options">
              <label className="admin-login__remember">
                <input checked={remember} onChange={(event) => setRemember(event.target.checked)} type="checkbox" />
                <span>Remember me</span>
              </label>
              <a href="mailto:support@restaurent.com">Forgot password?</a>
            </div>

            <button className="admin-login__submit" disabled={busy} type="submit">
              {busy ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {message ? <p className="admin-login__message">{message}</p> : null}

          <footer className="admin-login__support">
            <p>
              Having trouble logging in? <a href="mailto:support@restaurent.com">Contact IT Support</a>
            </p>
          </footer>
        </div>
      </section>
    </main>
  );
}
