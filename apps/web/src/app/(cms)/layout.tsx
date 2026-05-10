"use client";

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { documentId, getCmsTenants } from '../../lib/api-client';
import { clearCmsSettings, readCmsSettings } from '../../lib/cms-storage';
import { canAccessPath, linksForRole } from '../../lib/role-access';

export default function CmsLayout({ children }: { children: ReactNode }): ReactNode {
  const pathname = usePathname();
  const router = useRouter();
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [role, setRole] = useState('');
  const [tenantStatus, setTenantStatus] = useState('');

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

    setRole(settings.role);
    setCheckedAuth(true);
    if (!['super_admin', 'platform_admin'].includes(settings.role) && settings.tenantId && settings.token) {
      void getCmsTenants(settings.token)
        .then((tenants) => {
          const tenant = tenants.find((item) => documentId(item) === settings.tenantId) ?? tenants[0];
          setTenantStatus(tenant?.status ?? '');
        })
        .catch(() => setTenantStatus(''));
    }
  }, [router]);

  function logout(): void {
    clearCmsSettings();
    router.replace('/login');
  }

  if (!checkedAuth) {
    return (
      <main className="page-shell">
        <p className="notice-text">Checking session...</p>
      </main>
    );
  }

  const links = linksForRole(role);
  const isPlatformRole = ['super_admin', 'platform_admin'].includes(role);
  const subscriptionBlocked = !isPlatformRole && tenantStatus !== '' && tenantStatus !== 'active';
  const subscriptionRecoveryPath = pathname === '/subscription' || pathname === '/settings';
  const showSubscriptionWarning = subscriptionBlocked && pathname !== '/subscription';
  const allowed = canAccessPath(role, pathname) && (!subscriptionBlocked || subscriptionRecoveryPath);

  return (
    <div className="cms-shell">
      <aside className="cms-sidebar">
        <Link className="cms-sidebar__brand" href={isPlatformRole ? '/super-admin' : '/dashboard'}>
          <span className="material-symbols-outlined cms-sidebar__brand-icon" aria-hidden="true">
            {isPlatformRole ? 'admin_panel_settings' : 'restaurant'}
          </span>
          <div className="cms-sidebar__brand-text">
            <span>Restaurent</span>
            <small>{isPlatformRole ? 'Platform console' : role ? `${role.replaceAll('_', ' ')} workspace` : 'Staff Portal'}</small>
          </div>
        </Link>

        <nav aria-label="Admin navigation" className="cms-sidebar__nav">
          {links.map((link) => {
            const active =
              link.href === '/super-admin'
                ? pathname === link.href
                : pathname === link.href || pathname.startsWith(`${link.href}/`);

            return (
              <Link
                aria-current={active ? 'page' : undefined}
                className={active ? 'active' : ''}
                href={link.href}
                key={link.href}
              >
                <span
                  aria-hidden="true"
                  className={`material-symbols-outlined${active ? ' filled' : ''}`}
                >
                  {link.icon}
                </span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="cms-sidebar__footer">
          {isPlatformRole ? (
            <Link className="cms-sidebar__cta" href="/super-admin/tenants">
              <span aria-hidden="true" className="material-symbols-outlined">add</span>
              Add New Tenant
            </Link>
          ) : null}
          <span className="pill">
            <span aria-hidden="true" className="material-symbols-outlined">
              {isPlatformRole ? 'shield_person' : 'storefront'}
            </span>
            {isPlatformRole ? 'Platform' : 'Harbor Grill'}
          </span>
          <div className="cms-sidebar__footer-links">
            <Link href="/login">Switch account</Link>
            <span style={{ color: 'var(--outline-variant)' }}>|</span>
            <button className="button-link" onClick={logout} type="button">Logout</button>
          </div>
        </div>
      </aside>

      <div className="cms-content">
        {showSubscriptionWarning ? (
          <div className="subscription-warning">
            <strong>Subscription needs attention</strong>
            <span>Your subscription is cancelled, suspended, or payment failed. Update billing to restore workspace access.</span>
            <Link href="/subscription">Open billing</Link>
          </div>
        ) : null}
        {allowed ? (
          children
        ) : (
          <main className="page-shell">
            <section className="panel">
              <p className="eyebrow">{subscriptionBlocked ? 'Billing required' : 'Access denied'}</p>
              <h1>{subscriptionBlocked ? 'Update billing to restore this workspace.' : 'This workspace is not available for your role.'}</h1>
              <p className="muted">
                {subscriptionBlocked
                  ? 'The account can still sign in, but product features are paused until the Stripe subscription is active again.'
                  : `Use the sidebar to open an area assigned to ${role.replaceAll('_', ' ') || 'your account'}.`}
              </p>
              {subscriptionBlocked ? <Link className="button-secondary" href="/subscription">Go to subscription</Link> : null}
            </section>
          </main>
        )}
      </div>
    </div>
  );
}
