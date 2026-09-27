'use client';

import { BellRing, ChartLine, IndianRupee, ReceiptText, ShoppingBasket } from 'lucide-react';
import { DataTable } from '@/components/data-table';
import { EmptyState } from '@/components/empty-state';
import { PageShell } from '@/components/page-shell';
import { SectionCard } from '@/components/section-card';
import { StatCard, StatGrid } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getCmsAnalyticsMenu, getCmsAnalyticsOverview, type CmsAnalyticsOverview } from '@/lib/api-client';
import { money } from '@/lib/format';
import { useCmsResource } from '@/lib/use-cms-resource';

export default function AnalyticsPage() {
  const resource = useCmsResource<{
    items: { available: boolean; name: string; price: number }[];
    overview: CmsAnalyticsOverview | null;
  }>(
    async ({ branchId, token }) => {
      const [overview, menu] = await Promise.all([getCmsAnalyticsOverview(branchId, token), getCmsAnalyticsMenu(branchId, token)]);
      return { items: menu.items, overview };
    },
    { events: ['order.created', 'order.status_updated'], initial: { items: [], overview: null } },
  );
  const { items, overview } = resource.data;

  return (
    <PageShell
      resource={resource}
      what="analytics"
      description="Sales, basket size, live activity, and menu mix for this outlet. Figures update as orders move."
      eyebrow="Analytics"
      title="Analytics"
    >
      {resource.status === 'loading' ? (
        <StatGrid>
          {[0, 1, 2, 3].map((index) => (
            <Skeleton className="h-28 rounded-xl" key={index} />
          ))}
        </StatGrid>
      ) : overview ? (
        <StatGrid>
          <StatCard icon={IndianRupee} label="Gross sales today" tone="primary" value={money(overview.todayRevenue)} />
          <StatCard icon={ShoppingBasket} label="Average basket" tone="info" value={money(overview.avgBasket)} />
          <StatCard icon={ReceiptText} label="Live orders" tone="success" value={overview.liveOrders} />
          <StatCard icon={BellRing} label="Open requests" tone="warning" value={overview.serviceRequestsOpen} />
        </StatGrid>
      ) : null}

      <SectionCard contentClassName="space-y-0" description="Every dish on the menu with its current price and visibility." title="Menu mix">
        <DataTable
          columns={[
            { header: 'Dish', key: 'name', render: (item) => <span className="font-semibold">{item.name}</span> },
            { header: 'Price', key: 'price', render: (item) => <span className="tabular-nums">{money(item.price)}</span> },
            {
              header: 'Status',
              key: 'status',
              render: (item) => <StatusBadge kind="menu" label={item.available ? 'Live' : 'Off'} value={item.available ? 'available' : 'hidden'} />,
            },
          ]}
          empty={<EmptyState compact icon={ChartLine} title="No menu data yet" />}
          loading={resource.status === 'loading'}
          pageSize={10}
          rowKey={(item) => item.name}
          rows={items}
          searchPlaceholder="Search dishes"
          searchText={(item) => item.name}
        />
      </SectionCard>
    </PageShell>
  );
}
