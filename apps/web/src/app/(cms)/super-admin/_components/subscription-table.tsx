import { Building2 } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { DataTable } from '@/components/data-table';
import { EmptyState } from '@/components/empty-state';
import { SectionCard } from '@/components/section-card';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { documentId, type CmsSuperAdminTenantSummary } from '@/lib/api-client';

import { platformMoney } from './platform-console';

export function SubscriptionTable({
  loading = false,
  tenants,
}: {
  loading?: boolean;
  tenants: CmsSuperAdminTenantSummary[];
}): ReactNode {
  return (
    <SectionCard contentClassName="space-y-0" title="Tenant subscriptions">
      <DataTable
        columns={[
          { header: 'Tenant', key: 'tenant', render: (item) => <span className="font-semibold">{item.tenant.legalName}</span> },
          { header: 'Plan', key: 'plan', render: (item) => <span>{item.plan?.name ?? 'No plan'}</span> },
          {
            header: 'Status',
            key: 'status',
            render: (item) =>
              item.subscription?.status ? (
                <StatusBadge kind="subscription" value={item.subscription.status} />
              ) : (
                <Badge variant="secondary">Not started</Badge>
              ),
          },
          {
            header: 'Monthly',
            key: 'monthly',
            render: (item) => <span className="tabular-nums">{platformMoney(item.plan?.monthlyPrice ?? 0, item.plan?.currency ?? 'INR')}</span>,
          },
          {
            className: 'text-right',
            header: '',
            key: 'actions',
            render: (item) => (
              <Button asChild size="sm" variant="outline">
                <Link href={`/super-admin/tenants/${documentId(item.tenant)}`}>Open</Link>
              </Button>
            ),
          },
        ]}
        empty={<EmptyState compact icon={Building2} title="No tenants yet" />}
        loading={loading}
        rowKey={(item) => documentId(item.tenant)}
        rows={tenants}
      />
    </SectionCard>
  );
}
