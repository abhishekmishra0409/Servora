'use client';

import { KeyRound } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { FormActions, FormField } from '@/components/form-field';
import { SectionCard } from '@/components/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { changeCmsPassword } from '@/lib/api-client';
import { errorMessage } from '@/lib/async-state';
import { readCmsSettings } from '@/lib/cms-storage';

export function ChangePasswordForm({ token: tokenProp = '' }: { token?: string }): ReactNode {
  const [busy, setBusy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [error, setError] = useState('');
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
    setError('');
    if (!token) {
      setError('Sign in to change your password.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setBusy(true);
    try {
      await changeCmsPassword(currentPassword, newPassword, token);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password updated. Use it the next time you sign in.');
    } catch (caught) {
      setError(errorMessage(caught, 'Could not change password.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SectionCard description="Update the password for your current account." title="Change password">
      <FormField htmlFor="current-password" label="Current password">
        <Input
          autoComplete="current-password"
          id="current-password"
          onChange={(event) => setCurrentPassword(event.target.value)}
          type="password"
          value={currentPassword}
        />
      </FormField>
      <FormField hint="At least 8 characters." htmlFor="new-password" label="New password">
        <Input autoComplete="new-password" id="new-password" onChange={(event) => setNewPassword(event.target.value)} type="password" value={newPassword} />
      </FormField>
      <FormField error={error || undefined} htmlFor="confirm-password" label="Confirm new password">
        <Input
          autoComplete="new-password"
          id="confirm-password"
          onChange={(event) => setConfirmPassword(event.target.value)}
          type="password"
          value={confirmPassword}
        />
      </FormField>
      <FormActions>
        <Button disabled={busy || !currentPassword || !newPassword || !confirmPassword} onClick={() => void submit()} type="button">
          <KeyRound />
          Update password
        </Button>
      </FormActions>
    </SectionCard>
  );
}
