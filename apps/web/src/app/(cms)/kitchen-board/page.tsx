'use client';

import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

import { useCmsSession } from '@/components/cms-session-provider';
import { KanbanBoard } from '@/components/kanban-board';
import { LoadingKanban } from '@/components/loading-state';
import { OrderTicket } from '@/components/order-ticket';
import { PageShell } from '@/components/page-shell';
import { Button } from '@/components/ui/button';
import { documentId, getLiveOrders, updateOrderStatus, type LiveOrder } from '@/lib/api-client';
import { errorMessage } from '@/lib/async-state';
import { elapsedSince } from '@/lib/format';
import { toneFor } from '@/lib/status-tone';
import { readCmsContext, useCmsResource } from '@/lib/use-cms-resource';

const lanes = [
  { next: 'preparing', nextLabel: 'Start preparing', permission: 'orders:status-preparing', status: 'accepted', title: 'Accepted' },
  { next: 'ready', nextLabel: 'Mark ready', permission: 'orders:status-ready', status: 'preparing', title: 'Preparing' },
  { next: 'served', nextLabel: 'Clear ticket', permission: 'orders:status-served', status: 'ready', title: 'Ready' },
];

export default function KitchenBoardPage() {
  const { can } = useCmsSession();
  const [busy, setBusy] = useState('');
  const resource = useCmsResource<LiveOrder[]>(
    async ({ branchId, token }) =>
      (await getLiveOrders(branchId, token)).filter((order) => ['accepted', 'preparing', 'ready'].includes(order.status)),
    { events: ['order.created', 'order.status_updated'], initial: [], pollMs: 30000 },
  );
  const orders = resource.data;

  async function advance(order: LiveOrder, nextStatus: string): Promise<void> {
    const id = documentId(order);
    setBusy(id);
    try {
      await updateOrderStatus(id, nextStatus, readCmsContext().token);
      await resource.reload();
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
    <PageShell
      description="Accepted, preparing, and ready tickets from the live queue. Refreshes every 30 seconds."
      eyebrow="Kitchen"
      title="Kitchen board"
      resource={resource}
      what="kitchen tickets"
    >
      {resource.status === 'loading' ? (
        <LoadingKanban columns={3} />
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
                    {can(lane.permission) ? (
                      <Button disabled={busy === id} onClick={() => void advance(order, lane.next)} size="sm" type="button">
                        {lane.nextLabel}
                      </Button>
                    ) : null}
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
