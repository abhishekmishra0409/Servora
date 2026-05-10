'use client';

import { useEffect, useState } from 'react';

import { changeCmsPassword } from '../lib/api-client';
import { readCmsSettings } from '../lib/cms-storage';

export function ChangePasswordForm({ token: tokenProp = '' }: { token?: string }) {
  const [busy, setBusy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [message, setMessage] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [token, setToken] = useState(tokenProp);

  useEffect(() => {
    if (tokenProp) {
      setToken(tokenProp);
      return;
    }
    setToken(readCmsSettings().token);
  }, [tokenProp]);

  async function submit(): Promise<void> {
    if (!token) {
      setMessage('Sign in to change your password.');
      return;
    }
    if (newPassword.length < 8) {
      setMessage('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage('New password and confirmation do not match.');
      return;
    }

    setBusy(true);
    try {
      await changeCmsPassword(currentPassword, newPassword, token);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage('Password updated. Use the new password the next time you sign in.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not change password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="panel">
      <h2>Change password</h2>
      <p className="muted">Update the password for your current account.</p>
      {message ? <p className="notice-text">{message}</p> : null}
      <div className="cms-form-grid">
        <label>
          <span>Current password</span>
          <input
            autoComplete="current-password"
            onChange={(event) => setCurrentPassword(event.target.value)}
            type="password"
            value={currentPassword}
          />
        </label>
        <label>
          <span>New password</span>
          <input
            autoComplete="new-password"
            onChange={(event) => setNewPassword(event.target.value)}
            type="password"
            value={newPassword}
          />
        </label>
        <label>
          <span>Confirm new password</span>
          <input
            autoComplete="new-password"
            onChange={(event) => setConfirmPassword(event.target.value)}
            type="password"
            value={confirmPassword}
          />
        </label>
        <button
          disabled={busy || !currentPassword || !newPassword || !confirmPassword}
          onClick={() => void submit()}
          type="button"
        >
          Update password
        </button>
      </div>
    </article>
  );
}
