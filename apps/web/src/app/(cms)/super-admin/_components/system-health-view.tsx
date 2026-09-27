'use client';

import { Activity, Building2, CreditCard, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import { SectionCard } from '@/components/section-card';
import { StatCard, StatGrid } from '@/components/stat-card';
import { Badge } from '@/components/ui/badge';

import { usePlatformConsole } from './platform-console';
import { PlatformPage } from './platform-page';
import { RecentEvents } from './recent-events';

export function SystemHealthView(): ReactNode {
  const console = usePlatformConsole();
  const { plans, recentEvents, state, stats, tenants } = console;
  const apiHealthy = state.status === 'ready';
  const stripeConfigured = plans.filter((plan) => plan.stripePriceId || plan.stripeProductId).length;
  const attentionTenants = tenants.filter((item) =>
    ['past_due', 'suspended', 'cancelled'].includes(item.subscription?.status ?? item.tenant.status),
  );

  const checks: { detail: string; label: string; ok: boolean }[] = [
    { detail: apiHealthy ? 'Tenant and plan queries answered.' : state.error ?? 'Waiting for the API.', label: 'API', ok: apiHealthy },
    {
      detail: `${stripeConfigured} of ${plans.length} plans have a Stripe product or price.`,
      label: 'Stripe plans',
      ok: plans.length > 0 && stripeConfigured === plans.length,
    },
    {
      detail: attentionTenants.length ? attentionTenants.map((item) => item.tenant.legalName).join(', ') : 'No tenants are past due, suspended, or cancelled.',
      label: 'Billing attention',
      ok: attentionTenants.length === 0,
    },
  ];

  return (
    <PlatformPage
      description="Checks derived from live platform data. Infrastructure metrics such as latency and uptime are not collected yet."
      onRefresh={() => void console.load()}
      refreshing={console.busy}
      state={state}
      title="System health"
    >
      <StatGrid>
        <StatCard icon={Activity} label="API" tone={apiHealthy ? 'success' : state.status === 'error' ? 'destructive' : 'default'} value={apiHealthy ? 'Healthy' : state.status === 'error' ? 'Down' : 'Checking'} />
        <StatCard icon={Building2} label="Tenants" tone="primary" value={stats.totalTenants} />
        <StatCard icon={CreditCard} label="Active subscriptions" tone="info" value={stats.activeSubscriptions} />
        <StatCard icon={TriangleAlert} label="Attention queue" tone={stats.attention > 0 ? 'warning' : 'default'} value={stats.attention} />
      </StatGrid>

      <section className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Checks">
          <ul className="divide-y">
            {checks.map((check) => (
              <li className="flex items-start justify-between gap-3 py-3" key={check.label}>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{check.label}</p>
                  <p className="text-xs text-muted-foreground">{check.detail}</p>
                </div>
                <Badge variant={check.ok ? 'success' : 'warning'}>{check.ok ? 'OK' : 'Review'}</Badge>
              </li>
            ))}
          </ul>
        </SectionCard>
        <RecentEvents events={recentEvents} loading={state.status === 'loading'} />
      </section>
    </PlatformPage>
  );
}
