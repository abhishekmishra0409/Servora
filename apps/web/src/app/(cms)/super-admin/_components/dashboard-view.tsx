'use client';

import { Building2, CircleCheckBig, IndianRupee, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import { SectionCard } from '@/components/section-card';
import { StatCard, StatGrid } from '@/components/stat-card';
import { Badge } from '@/components/ui/badge';

import { platformMoney, usePlatformConsole } from './platform-console';
import { PlatformPage } from './platform-page';
import { RecentEvents } from './recent-events';

export function DashboardView(): ReactNode {
  const console = usePlatformConsole();
  const { recentEvents, state, stats } = console;
  const loading = state.status === 'loading';

  return (
    <PlatformPage
      description="Tenant growth, subscription health, and what needs attention across the platform."
      onRefresh={() => void console.load()}
      refreshing={console.busy}
      state={state}
      title="Platform dashboard"
    >
      <StatGrid>
        <StatCard loading={loading} icon={Building2} label="Total tenants" tone="primary" value={stats.totalTenants} />
        <StatCard loading={loading} icon={CircleCheckBig} label="Active tenants" tone="success" value={stats.activeTenants} />
        <StatCard loading={loading} icon={IndianRupee} label="Current MRR" tone="info" value={platformMoney(stats.monthlyValue)} />
        <StatCard loading={loading} icon={TriangleAlert} label="Needs attention" tone={stats.attention > 0 ? 'warning' : 'default'} value={stats.attention} />
      </StatGrid>

      <section className="grid gap-4 lg:grid-cols-2">
        <RecentEvents events={recentEvents} loading={loading} />
        <SectionCard description="Counts from live platform records." title="Health indicators">
          <dl className="divide-y text-sm">
            {[
              ['API readiness', state.status === 'ready' ? 'Healthy' : state.status === 'error' ? 'Unreachable' : 'Checking'],
              ['Subscription plans', `${stats.activePlans} active in Stripe`],
              ['Active subscriptions', String(stats.activeSubscriptions)],
              ['Attention queue', String(stats.attention)],
            ].map(([label, value]) => (
              <div className="flex items-center justify-between gap-3 py-2.5" key={label}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd>
                  <Badge variant={value === 'Unreachable' ? 'destructive' : 'secondary'}>{value}</Badge>
                </dd>
              </div>
            ))}
          </dl>
        </SectionCard>
      </section>
    </PlatformPage>
  );
}
