'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ErrorState } from '@/components/error-state';
import { KanbanBoard } from '@/components/kanban-board';
import { LoadingCards } from '@/components/loading-state';
import { OrderTicket } from '@/components/order-ticket';
import { PageHeader } from '@/components/page-header';
import { PageShell } from '@/components/page-shell';
import { Button } from '@/components/ui/button';
import { documentId, getLiveOrders, updateOrderStatus, type LiveOrder } from '@/lib/api-client';
import { errorMessage, failed, loading, ready, type AsyncState } from '@/lib/async-state';
import { readCmsSettings } from '@/lib/cms-storage';
import { elapsedSince } from '@/lib/format';
import { createSocketClient } from '@/lib/socket';
import { toneFor } from '@/lib/status-tone';

const lanes = [
  { next: 'preparing', nextLabel: 'Start preparing', status: 'accepted', title: 'Accepted' },
  { next: 'ready', nextLabel: 'Mark ready', status: 'preparing', title: 'Preparing' },
  { next: 'served', nextLabel: 'Clear ticket', status: 'ready', title: 'Ready' },
];

export default function KitchenBoardPage() {
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [busy, setBusy] = useState('');
  const [state, setState] = useState<AsyncState>(loading);

  const settings = useMemo(() => (typeof window === 'undefined' ? null : readCmsSettings()), []);

  async function load(): Promise<void> {
    if (!settings?.branchId || !settings.token) {
      setState(failed(new Error('This account is not linked to an outlet yet.')));
      return;
    }
    try {
      const nextOrders = await getLiveOrders(settings.branchId, settings.token);
      setOrders(nextOrders.filter((order) => ['accepted', 'preparing', 'ready'].includes(order.status)));
      setState(ready);
    } catch (error) {
      setState(failed(error, 'Could not load kitchen tickets.'));
    }
  }

  useEffect(() => {
    void load();
    const socket = settings?.token ? createSocketClient(settings.token) : null;
    socket?.on('order.created', () => void load());
    socket?.on('order.status_updated', () => void load());
    socket?.connect();
    const interval = window.setInterval(() => void load(), 30000);
    return () => {
      window.clearInterval(interval);
      socket?.disconnect();
    };
  }, []);

  async function advance(order: LiveOrder, nextStatus: string): Promise<void> {
    if (!settings?.token) return;
    const id = documentId(order);
    setBusy(id);
    try {
      await updateOrderStatus(id, nextStatus, settings.token);
      await load();
    } catch (error) {
      toast.error(errorMessage(error, 'Could not update ticket.'));
    } finally {
      setBusy('');
    }
  }

  const columns = lanes.map((lane) => ({
    items: orders.filter((order) => order.status === lane.status),
    key: lane.status,
    lane,
    title: lane.title,
    tone: toneFor('order', lane.status),
  }));

  return (
    <PageShell>
      <PageHeader
        description="Accepted, preparing, and ready tickets from the live queue. Refreshes every 30 seconds."
        eyebrow="Kitchen"
        onRefresh={() => void load()}
        refreshing={state.status === 'loading'}
        title="Kitchen board"
      />

      {state.status === 'error' ? <ErrorState message={state.error ?? ''} onRetry={() => void load()} /> : null}

      {state.status === 'loading' ? (
        <LoadingCards count={3} />
      ) : (
        <KanbanBoard
          columns={columns}
          emptyLabel="No tickets in this lane"
          itemKey={documentId}
          renderCard={(order, column) => {
            const id = documentId(order);
            const lane = lanes.find((item) => item.status === column.key) ?? lanes[0]!;
            return (
              <OrderTicket
                actions={
                  <>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/kitchen-board/${id}`}>View ticket</Link>
                    </Button>
                    <Button disabled={busy === id} onClick={() => void advance(order, lane.next)} size="sm" type="button">
                      {lane.nextLabel}
                    </Button>
                  </>
                }
                meta={elapsedSince(order.submittedAt)}
                order={order}
                showPrices={false}
              />
            );
          }}
        />
      )}
    </PageShell>
  );
}
