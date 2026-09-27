'use client';

import { BellRing, ChefHat, CircleCheckBig, IndianRupee, ReceiptText, Armchair } from 'lucide-react';
import { useMemo } from 'react';

import { EmptyState } from '@/components/empty-state';
import { LoadingRows } from '@/components/loading-state';
import { PageShell } from '@/components/page-shell';
import { SectionCard } from '@/components/section-card';
import { StatCard, StatGrid } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { getLiveOrders, getOrderById, type LiveOrder } from '@/lib/api-client';
import { money, shortId } from '@/lib/format';
import { formatOrderNumber } from '@/lib/order-number';
import { readCmsContext, useCmsResource } from '@/lib/use-cms-resource';

const liveStatuses = new Set(['accepted', 'pending_confirmation', 'preparing', 'ready']);

const orderKey = (order: LiveOrder): string => order.id ?? order._id ?? '';

function upsertOrder(currentOrders: LiveOrder[], order: LiveOrder): LiveOrder[] {
  const nextOrderKey = orderKey(order);
  const withoutExisting = currentOrders.filter((currentOrder) => orderKey(currentOrder) !== nextOrderKey);
  return [order, ...withoutExisting].sort(
    (left, right) => new Date(right.submittedAt ?? 0).getTime() - new Date(left.submittedAt ?? 0).getTime(),
  );
}

export default function DashboardPage() {
  const resource = useCmsResource<LiveOrder[]>(({ branchId, token }) => getLiveOrders(branchId, token), {
    events: ['order.created', 'order.status_updated'],
    initial: [],
    // Patch the one order that changed instead of refetching the whole queue.
    onEvent: (_event, payload) => {
      const orderId = (payload as { orderId?: string } | undefined)?.orderId;
      if (!orderId) return false;
      void getOrderById(orderId, readCmsContext().token)
        .then((order) =>
          resource.setData((current) =>
            liveStatuses.has(order.status) ? upsertOrder(current, order) : current.filter((item) => orderKey(item) !== orderKey(order)),
          ),
        )
        .catch(() => void resource.reload());
      return true;
    },
  });
  const orders = resource.data;
  const isLoading = resource.status === 'loading';

  const kpis = useMemo(() => {
    const pending = orders.filter((order) => order.status === 'pending_confirmation').length;
    const kitchen = orders.filter((order) => ['accepted', 'preparing', 'ready'].includes(order.status)).length;
    const readyCount = orders.filter((order) => order.status === 'ready').length;
    const value = orders.reduce((total, order) => total + order.grandTotal, 0);
    return { kitchen, pending, ready: readyCount, value };
  }, [orders]);

  const pendingOrders = orders.filter((order) => order.status === 'pending_confirmation');

  return (
    <PageShell
      description="Live view of the order queue for this outlet. Updates arrive in realtime."
      eyebrow="Overview"
      resource={resource}
      title="Live dashboard"
      what="the order queue"
    >
      <StatGrid>
        <StatCard loading={isLoading} icon={BellRing} label="Pending confirmation" tone="warning" value={kpis.pending} />
        <StatCard loading={isLoading} icon={ChefHat} label="Kitchen queue" tone="info" value={kpis.kitchen} />
        <StatCard loading={isLoading} icon={CircleCheckBig} label="Ready to serve" tone="success" value={kpis.ready} />
        <StatCard loading={isLoading} icon={IndianRupee} label="Live order value" tone="primary" value={money(kpis.value)} />
      </StatGrid>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <SectionCard className="lg:row-span-2" description="Newest first" title="Priority orders">
          {isLoading ? (
            <LoadingRows count={4} />
          ) : orders.length === 0 ? (
            <EmptyState compact description="New orders from the floor will show up here." icon={ReceiptText} title="No live orders" />
          ) : (
            <ul className="divide-y">
              {orders.slice(0, 6).map((order) => (
                <li className="flex items-center gap-3 py-3" key={orderKey(order)}>
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <ReceiptText aria-hidden="true" className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{formatOrderNumber(order.orderNo)}</p>
                    <p className="text-xs text-muted-foreground">Table ···{shortId(order.tableId)}</p>
                  </div>
                  <StatusBadge kind="order" value={order.status} />
                  <span className="w-24 text-right text-sm font-semibold tabular-nums">{money(order.grandTotal)}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Floor signals">
          {isLoading ? (
            <LoadingRows count={3} />
          ) : orders.length === 0 ? (
            <EmptyState compact icon={Armchair} title="No active tables" />
          ) : (
            <ul className="divide-y">
              {orders.slice(0, 4).map((order) => (
                <li className="flex items-center gap-3 py-3" key={`${orderKey(order)}-table`}>
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                    <Armchair aria-hidden="true" className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">Table ···{shortId(order.tableId)}</p>
                    <p className="text-xs text-muted-foreground">{order.items.length} active items</p>
                  </div>
                  <StatusBadge kind="order" value={order.status} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard description="Orders waiting for a waiter to confirm" title="Confirmation queue">
          {isLoading ? (
            <LoadingRows count={2} />
          ) : pendingOrders.length === 0 ? (
            <EmptyState compact icon={BellRing} title="Nothing waiting" />
          ) : (
            <ul className="divide-y">
              {pendingOrders.map((order) => (
                <li className="flex items-center gap-3 py-3" key={`${orderKey(order)}-service`}>
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-warning-foreground text-warning">
                    <BellRing aria-hidden="true" className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{formatOrderNumber(order.orderNo)}</p>
                    <p className="text-xs text-muted-foreground">Table ···{shortId(order.tableId)}</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{money(order.grandTotal)}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </section>
    </PageShell>
  );
}
