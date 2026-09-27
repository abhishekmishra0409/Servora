'use client';

import { CreditCard, LogOut, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { AppShell } from '@/components/app-shell';
import { useConfirm } from '@/components/confirm-dialog';
import { CmsSessionProvider, useCmsSession } from '@/components/cms-session-provider';
import { EmptyState } from '@/components/empty-state';
import { PageLoading } from '@/components/loading-state';
import { PageShell } from '@/components/page-shell';
import { Button } from '@/components/ui/button';
import { documentId, getCmsTenants, switchCmsBranch } from '@/lib/api-client';
import { clearCmsSettings, readCmsSettings, writeCmsSettings } from '@/lib/cms-storage';
import { canAccessPathWithPermissions, linksForPermissions } from '@/lib/role-access';
import { humanize } from '@/lib/status-tone';

export default function CmsLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <CmsSessionProvider>
      <CmsChrome>{children}</CmsChrome>
    </CmsSessionProvider>
  );
}

function CmsChrome({ children }: { children: ReactNode }): ReactNode {
  const pathname = usePathname();
  const router = useRouter();
  const session = useCmsSession();
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [tenantStatus, setTenantStatus] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [switching, setSwitching] = useState(false);
  const confirm = useConfirm();
  const role = session.role;

  useEffect(() => {
    const settings = readCmsSettings();
    if (!settings.token && !settings.refreshToken) {
      router.replace('/login');
      return;
    }
    if (!settings.role) {
      clearCmsSettings();
      router.replace('/login');
      return;
    }

    setCheckedAuth(true);
    if (!['super_admin', 'platform_admin'].includes(settings.role) && settings.tenantId && settings.token) {
      void getCmsTenants(settings.token)
        .then((tenants) => {
          const tenant = tenants.find((item) => documentId(item) === settings.tenantId) ?? tenants[0];
          setTenantStatus(tenant?.status ?? '');
          setRestaurantName(tenant?.legalName ?? '');
        })
        .catch(() => setTenantStatus(''));
    }
  }, [router]);

  async function logout(): Promise<void> {
    const ok = await confirm({
      confirmLabel: 'Log out',
      description: 'You will need your email and password to get back into this workspace.',
      icon: LogOut,
      title: 'Log out of Servora?',
      tone: 'warning',
    });
    if (!ok) return;
    clearCmsSettings();
    router.replace('/login');
  }

  async function changeBranch(branchId: string): Promise<void> {
    setSwitching(true);
    const target = session.branches.find((branch) => branch.branchId === branchId);
    try {
      const next = await switchCmsBranch(branchId, session.token);
      // The role can differ per outlet, so the whole session is re-issued.
      writeCmsSettings(
        next.branchId ?? '',
        next.accessToken,
        next.tenantId,
        next.refreshToken,
        next.role,
        next.userId,
      );
      await session.reload();
      router.refresh();
      toast.success(`Switched to ${target?.name ?? 'the selected outlet'}`);
    } catch {
      toast.error('Could not switch outlet. You are still on the current one.');
    } finally {
      setSwitching(false);
    }
  }

  if (!checkedAuth) {
    return <PageLoading label="Checking session" />;
  }

  const links = linksForPermissions(session.permissions, role);
  const isPlatformRole = ['super_admin', 'platform_admin'].includes(role);
  const subscriptionBlocked = !isPlatformRole && tenantStatus !== '' && tenantStatus !== 'active';
  const subscriptionRecoveryPath = pathname === '/subscription' || pathname === '/settings';
  const showSubscriptionWarning = subscriptionBlocked && pathname !== '/subscription';
  const allowed =
    canAccessPathWithPermissions(session.permissions, role, pathname) &&
    (!subscriptionBlocked || subscriptionRecoveryPath);

  const banner = showSubscriptionWarning ? (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-destructive/20 bg-destructive/10 px-4 py-3 text-sm md:px-8"
      role="alert"
    >
      <span className="inline-flex items-center gap-2 font-semibold text-destructive">
        <CreditCard aria-hidden="true" className="size-4" />
        Subscription needs attention
      </span>
      <span className="text-muted-foreground">
        Your subscription is cancelled, suspended, or payment failed. Update billing to restore workspace access.
      </span>
      <Button asChild className="ml-auto" size="sm" variant="outline">
        <Link href="/subscription">Open billing</Link>
      </Button>
    </div>
  ) : null;

  return (
    <AppShell
      banner={banner}
      branchId={session.branchId}
      branches={session.branches}
      canManageOutlets={session.can('branches:view')}
      homeHref={isPlatformRole ? '/super-admin' : '/dashboard'}
      isPlatformRole={isPlatformRole}
      links={links}
      onBranchChange={(branchId) => void changeBranch(branchId)}
      onLogout={() => void logout()}
      restaurantName={restaurantName}
      role={role}
      switching={switching}
    >
      {allowed ? (
        children
      ) : (
        <PageShell>
          <EmptyState
            action={
              subscriptionBlocked ? (
                <Button asChild>
                  <Link href="/subscription">Go to subscription</Link>
                </Button>
              ) : undefined
            }
            description={
              subscriptionBlocked
                ? 'The account can still sign in, but product features are paused until the subscription is active again.'
                : `Use the navigation to open an area assigned to ${humanize(role) || 'your account'}.`
            }
            icon={subscriptionBlocked ? CreditCard : ShieldAlert}
            title={subscriptionBlocked ? 'Update billing to restore this workspace' : 'This area is not available for your role'}
          />
        </PageShell>
      )}
    </AppShell>
  );
}
