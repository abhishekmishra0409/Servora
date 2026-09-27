'use client';

import { BellRing, ChefHat, CircleCheckBig, IndianRupee, ReceiptText, Armchair } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadingRows } from '@/components/loading-state';
import { PageHeader } from '@/components/page-header';
import { PageShell } from '@/components/page-shell';
import { SectionCard } from '@/components/section-card';
import { StatCard, StatGrid } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { getLiveOrders, getOrderById, type LiveOrder } from '@/lib/api-client';
import { failed, loading, ready, type AsyncState } from '@/lib/async-state';
import { readCmsSettings } from '@/lib/cms-storage';
import { money, shortId } from '@/lib/format';
import { formatOrderNumber } from '@/lib/order-number';
import { createSocketClient } from '@/lib/socket';

const liveStatuses = new Set(['accepted', 'pending_confirmation', 'preparing', 'ready']);

const orderKey = (order: LiveOrder): string => order.id ?? order._id ?? '';

export default function DashboardPage() {
  const [branchId, setBranchId] = useState('');
  const [token, setToken] = useState('');
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [state, setState] = useState<AsyncState>(loading);

  useEffect(() => {
    const settings = readCmsSettings();
    setBranchId(settings.branchId);
    setToken(settings.token);
    void load(settings.branchId, settings.token);
    const socket = settings.token ? createSocketClient(settings.token) : null;
    const syncOrderEvent = (payload?: { orderId?: string }): void => {
      if (payload?.orderId) {
        void syncOrder(payload.orderId, settings.branchId, settings.token);
        return;
      }
      void load(settings.branchId, settings.token);
    };
    socket?.on('order.created', syncOrderEvent);
    socket?.on('order.status_updated', syncOrderEvent);
    socket?.connect();
    return () => {
      socket?.disconnect();
    };
  }, []);

  const kpis = useMemo(() => {
    const pending = orders.filter((order) => order.status === 'pending_confirmation').length;
    const kitchen = orders.filter((order) => ['accepted', 'preparing', 'ready'].includes(order.status)).length;
    const readyCount = orders.filter((order) => order.status === 'ready').length;
    const value = orders.reduce((total, order) => total + order.grandTotal, 0);
    return { kitchen, pending, ready: readyCount, value };
  }, [orders]);

  async function load(nextBranchId = branchId, nextToken = token): Promise<void> {
    if (!nextBranchId || !nextToken) {
      setOrders([]);
      setState(failed(new Error('This account is not linked to an outlet yet.')));
      return;
    }
    try {
      setOrders(await getLiveOrders(nextBranchId, nextToken));
      setState(ready);
    } catch (error) {
      setOrders([]);
      setState(failed(error, 'Could not load dashboard data.'));
    }
  }

  async function syncOrder(orderId: string, nextBranchId = branchId, nextToken = token): Promise<void> {
    if (!nextBranchId || !nextToken) {
      return;
    }
    try {
      const order = await getOrderById(orderId, nextToken);
      setOrders((currentOrders) =>
        liveStatuses.has(order.status)
          ? upsertOrder(currentOrders, order)
          : currentOrders.filter((currentOrder) => orderKey(currentOrder) !== orderKey(order)),
      );
    } catch {
      void load(nextBranchId, nextToken);
    }
  }

  function upsertOrder(currentOrders: LiveOrder[], order: LiveOrder): LiveOrder[] {
    const nextOrderKey = orderKey(order);
    const withoutExisting = currentOrders.filter((currentOrder) => orderKey(currentOrder) !== nextOrderKey);
    return [order, ...withoutExisting].sort(
      (left, right) => new Date(right.submittedAt ?? 0).getTime() - new Date(left.submittedAt ?? 0).getTime(),
    );
  }

  const pendingOrders = orders.filter((order) => order.status === 'pending_confirmation');

  return (
    <PageShell>
      <PageHeader
        description="Live view of the order queue for this outlet. Updates arrive in realtime."
        eyebrow="Overview"
        onRefresh={() => void load()}
        refreshing={state.status === 'loading'}
        title="Live dashboard"
      />

      {state.status === 'error' ? <ErrorState message={state.error ?? ''} onRetry={() => void load()} /> : null}

      <StatGrid>
        <StatCard icon={BellRing} label="Pending confirmation" tone="warning" value={kpis.pending} />
        <StatCard icon={ChefHat} label="Kitchen queue" tone="info" value={kpis.kitchen} />
        <StatCard icon={CircleCheckBig} label="Ready to serve" tone="success" value={kpis.ready} />
        <StatCard icon={IndianRupee} label="Live order value" tone="primary" value={money(kpis.value)} />
      </StatGrid>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <SectionCard className="lg:row-span-2" description="Newest first" title="Priority orders">
          {state.status === 'loading' ? (
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
          {state.status === 'loading' ? (
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
          {state.status === 'loading' ? (
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
