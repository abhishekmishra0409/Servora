'use client';

import { CircleCheckBig, IndianRupee, TriangleAlert, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';

import { StatCard, StatGrid } from '@/components/stat-card';

import { platformMoney, usePlatformConsole } from './platform-console';
import { PlatformPage } from './platform-page';
import { SubscriptionTable } from './subscription-table';

export function BillingView(): ReactNode {
  const console = usePlatformConsole();
  const { state, stats, tenants } = console;

  return (
    <PlatformPage
      description="Monthly recurring revenue, active subscriptions, and tenants whose billing needs attention."
      onRefresh={() => void console.load()}
      refreshing={console.busy}
      state={state}
      title="Billing"
    >
      <StatGrid>
        <StatCard icon={IndianRupee} label="Current MRR" tone="primary" value={platformMoney(stats.monthlyValue)} />
        <StatCard icon={CircleCheckBig} label="Active subscriptions" tone="success" value={stats.activeSubscriptions} />
        <StatCard icon={TriangleAlert} label="Past due or suspended" tone={stats.attention > 0 ? 'warning' : 'default'} value={stats.attention} />
        <StatCard icon={Wallet} label="Billing currency" value="INR" />
      </StatGrid>
      <SubscriptionTable loading={state.status === 'loading'} tenants={tenants} />
    </PlatformPage>
  );
}
