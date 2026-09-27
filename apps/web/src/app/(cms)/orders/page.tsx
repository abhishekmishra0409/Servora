'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useCmsSession } from '@/components/cms-session-provider';
import { useConfirm } from '@/components/confirm-dialog';
import { KanbanBoard } from '@/components/kanban-board';
import { LoadingKanban } from '@/components/loading-state';
import { OrderTicket } from '@/components/order-ticket';
import { PageShell } from '@/components/page-shell';
import { Button } from '@/components/ui/button';
import {
  confirmOrder,
  documentId,
  getLiveOrders,
  rejectOrder,
  updateOrderStatus,
  type LiveOrder,
} from '@/lib/api-client';
import { errorMessage } from '@/lib/async-state';
import { elapsedSince, money, shortId } from '@/lib/format';
import { formatOrderNumber } from '@/lib/order-number';
import { toneFor } from '@/lib/status-tone';
import { readCmsContext, useCmsResource } from '@/lib/use-cms-resource';

const statuses = [
  { key: 'pending_confirmation', title: 'Pending confirmation' },
  { key: 'accepted', title: 'Accepted' },
  { key: 'preparing', title: 'Preparing' },
  { key: 'ready', title: 'Ready' },
];

export default function OrdersPage() {
  const { can } = useCmsSession();
  const confirm = useConfirm();
  const [busy, setBusy] = useState('');
  const resource = useCmsResource<LiveOrder[]>(({ branchId, token }) => getLiveOrders(branchId, token), {
    events: ['order.created', 'order.status_updated'],
    initial: [],
  });
  const orders = resource.data;

  const columns = useMemo(
    () =>
      statuses.map((status) => ({
        items: orders.filter((order) => order.status === status.key),
        key: status.key,
        title: status.title,
        tone: toneFor('order', status.key),
      })),
    [orders],
  );

  async function act(order: LiveOrder, action: 'confirm' | 'reject' | 'preparing' | 'ready' | 'served'): Promise<void> {
    const id = documentId(order);
    if (
      action === 'reject' &&
      !(await confirm({
        confirmLabel: 'Reject order',
        description: `${formatOrderNumber(order.orderNo)} for table ···${shortId(order.tableId)} (${money(order.grandTotal)}) will not reach the kitchen.`,
        details: ['The guest sees the order as declined on their status screen.', 'This cannot be undone. The guest would need to order again.'],
        title: 'Reject this order?',
        tone: 'destructive',
      }))
    ) {
      return;
    }
    setBusy(id);
    const { token } = readCmsContext();
    try {
      if (action === 'confirm') {
        await confirmOrder(id, token);
      } else if (action === 'reject') {
        await rejectOrder(id, token);
      } else {
        await updateOrderStatus(id, action, token);
      }
      await resource.reload();
    } catch (error) {
      toast.error(errorMessage(error, 'Order action failed.'));
    } finally {
      setBusy('');
    }
  }

  const canConfirmOrders = can('orders:confirm');
  const canMoveKitchenStatus = can('orders:status-preparing', 'orders:status-ready');
  const canMarkServed = can('orders:status-served');

  return (
    <PageShell
      description="Confirm, reject, and move active tickets through service."
      eyebrow="Orders"
      title="Live orders"
      resource={resource}
      what="live orders"
    >
      {resource.status === 'loading' ? (
        <LoadingKanban columns={4} />
      ) : (
        <KanbanBoard
          columns={columns}
          emptyLabel="No orders in this stage"
          itemKey={documentId}
          renderCard={(order) => {
            const id = documentId(order);
            const isBusy = busy === id;
            return (
              <OrderTicket
                actions={
                  <>
                    {canConfirmOrders && order.status === 'pending_confirmation' ? (
                      <>
                        <Button disabled={isBusy} onClick={() => void act(order, 'confirm')} size="sm" type="button">
                          Confirm
                        </Button>
                        <Button
                          className="text-destructive hover:text-destructive"
                          disabled={isBusy}
                          onClick={() => void act(order, 'reject')}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          Reject
                        </Button>
                      </>
                    ) : null}
                    {canMoveKitchenStatus && order.status === 'accepted' ? (
                      <Button disabled={isBusy} onClick={() => void act(order, 'preparing')} size="sm" type="button">
                        Start preparing
                      </Button>
                    ) : null}
                    {canMoveKitchenStatus && order.status === 'preparing' ? (
                      <Button disabled={isBusy} onClick={() => void act(order, 'ready')} size="sm" type="button">
                        Mark ready
                      </Button>
                    ) : null}
                    {canMarkServed && order.status === 'ready' ? (
                      <Button disabled={isBusy} onClick={() => void act(order, 'served')} size="sm" type="button">
                        Mark served
                      </Button>
                    ) : null}
                  </>
                }
                meta={elapsedSince(order.submittedAt)}
                order={order}
              />
            );
          }}
        />
      )}
    </PageShell>
  );
}
