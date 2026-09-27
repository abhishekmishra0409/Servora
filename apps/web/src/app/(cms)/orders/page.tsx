'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useCmsSession } from '@/components/cms-session-provider';
import { useConfirm } from '@/components/confirm-dialog';
import { ErrorState } from '@/components/error-state';
import { KanbanBoard } from '@/components/kanban-board';
import { LoadingKanban } from '@/components/loading-state';
import { OrderTicket } from '@/components/order-ticket';
import { PageHeader } from '@/components/page-header';
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
import { errorMessage, failed, loading, ready, type AsyncState } from '@/lib/async-state';
import { readCmsSettings } from '@/lib/cms-storage';
import { elapsedSince, money, shortId } from '@/lib/format';
import { formatOrderNumber } from '@/lib/order-number';
import { createSocketClient } from '@/lib/socket';
import { toneFor } from '@/lib/status-tone';

const statuses = [
  { key: 'pending_confirmation', title: 'Pending confirmation' },
  { key: 'accepted', title: 'Accepted' },
  { key: 'preparing', title: 'Preparing' },
  { key: 'ready', title: 'Ready' },
];

export default function OrdersPage() {
  const { can } = useCmsSession();
  const confirm = useConfirm();
  const [branchId, setBranchId] = useState('');
  const [token, setToken] = useState('');
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [busy, setBusy] = useState('');
  const [state, setState] = useState<AsyncState>(loading);

  useEffect(() => {
    const settings = readCmsSettings();
    setBranchId(settings.branchId);
    setToken(settings.token);
    void load(settings.branchId, settings.token);
    const socket = settings.token ? createSocketClient(settings.token) : null;
    socket?.on('order.created', () => void load(settings.branchId, settings.token));
    socket?.on('order.status_updated', () => void load(settings.branchId, settings.token));
    socket?.connect();
    return () => {
      socket?.disconnect();
    };
  }, []);

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
      setState(failed(error, 'Could not load live orders.'));
    }
  }

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
    try {
      if (action === 'confirm') {
        await confirmOrder(id, token);
      } else if (action === 'reject') {
        await rejectOrder(id, token);
      } else {
        await updateOrderStatus(id, action, token);
      }
      await load();
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
    <PageShell>
      <PageHeader
        description="Confirm, reject, and move active tickets through service."
        eyebrow="Orders"
        onRefresh={() => void load()}
        refreshing={state.status === 'loading'}
        title="Live orders"
      />

      {state.status === 'error' ? <ErrorState message={state.error ?? ''} onRetry={() => void load()} /> : null}

      {state.status === 'loading' ? (
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
