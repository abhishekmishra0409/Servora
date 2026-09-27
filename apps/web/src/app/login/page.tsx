'use client';

import { AtSign, Eye, EyeOff, Lock, LogIn, Soup, UtensilsCrossed, Wallet } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { BrandLogo } from '@/components/brand-logo';
import { FormField } from '@/components/form-field';
import { InlineSpinner } from '@/components/loading-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loginStaff } from '@/lib/api-client';
import { writeCmsPermissions, writeCmsSettings } from '@/lib/cms-storage';

const staffRoles = ['Owner', 'Manager', 'Waiter', 'Kitchen', 'Cashier'];

const highlights = [
  { icon: UtensilsCrossed, label: 'Orders' },
  { icon: Soup, label: 'Kitchen' },
  { icon: Wallet, label: 'Bills' },
];

export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      const session = await loginStaff(email.trim(), password);
      const nextBranchId = session.branchId ?? '';
      const platformRole = ['super_admin', 'platform_admin'].includes(session.role);

      if (!nextBranchId && !platformRole) {
        setError('Signed in, but this account is not linked to an outlet. Contact support.');
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
      // Seed the permission cache so the CMS sidebar is right on first paint.
      writeCmsPermissions(session.permissions ?? []);
      toast.success('Signed in');
      router.push(platformRole ? '/super-admin' : '/dashboard');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Login failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section aria-labelledby="staff-login-title" className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md space-y-8">
          <BrandLogo href="/" subtitle="Staff workspace" />

          <header className="space-y-2">
            <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl" id="staff-login-title">
              Sign in to your workspace
            </h1>
            <p className="text-sm text-muted-foreground">
              One login for platform, owner, manager, waiter, kitchen, and cashier access. You land on the screens
              your role can use.
            </p>
            <ul aria-label="Supported staff roles" className="flex flex-wrap gap-1.5 pt-1">
              {staffRoles.map((role) => (
                <li key={role}>
                  <Badge variant="secondary">{role}</Badge>
                </li>
              ))}
            </ul>
          </header>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <FormField htmlFor="login-email" label="Email address">
              <div className="relative">
                <AtSign aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoComplete="email"
                  className="h-11 pl-9"
                  id="login-email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@restaurant.com"
                  required
                  type="email"
                  value={email}
                />
              </div>
            </FormField>

            <FormField htmlFor="login-password" label="Password">
              <div className="relative">
                <Lock aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoComplete="current-password"
                  className="h-11 pl-9 pr-11"
                  id="login-password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter password"
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                />
                <Button
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPassword((current) => !current)}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
            </FormField>

            {error ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <Button className="h-11 w-full" disabled={busy} size="lg" type="submit">
              {busy ? <InlineSpinner /> : <LogIn />}
              {busy ? 'Signing in' : 'Sign in'}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Forgot your password? Ask your restaurant owner or manager to reset it.
            </p>
          </form>
        </div>
      </section>

      <section aria-hidden="true" className="relative hidden overflow-hidden bg-primary lg:block">
        <Image alt="" className="object-cover" fill priority sizes="55vw" src="/images/login-hero.svg" />
        <div className="absolute inset-x-10 top-10 flex gap-2">
          {highlights.map(({ icon: Icon, label }) => (
            <span
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3.5 py-2 text-sm font-medium text-white backdrop-blur"
              key={label}
            >
              <Icon className="size-4" />
              {label}
            </span>
          ))}
        </div>
        <div className="absolute inset-x-10 bottom-10 max-w-lg rounded-2xl border border-white/30 bg-card/95 p-6 shadow-lg backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">One workspace for every role</p>
          <p className="mt-2 font-display text-2xl font-semibold tracking-tight">
            From the QR code on the table to the pass in the kitchen.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Each team member signs in here and sees the dashboard, actions, and navigation made for their role.
          </p>
        </div>
      </section>
    </main>
  );
}
