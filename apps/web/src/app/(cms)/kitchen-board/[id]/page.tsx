'use client';

import { ArrowLeft, Circle, CircleCheck } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadingRows } from '@/components/loading-state';
import { PageHeader } from '@/components/page-header';
import { PageShell } from '@/components/page-shell';
import { SectionCard } from '@/components/section-card';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { documentId, getLiveOrders, updateOrderStatus, type LiveOrder } from '@/lib/api-client';
import { errorMessage, failed, loading, ready, type AsyncState } from '@/lib/async-state';
import { readCmsSettings } from '@/lib/cms-storage';
import { shortId } from '@/lib/format';
import { formatOrderNumber } from '@/lib/order-number';
import { cn } from '@/lib/utils';

export default function KitchenTicketPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<AsyncState>(loading);
  const [order, setOrder] = useState<LiveOrder | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const settings = useMemo(() => (typeof window === 'undefined' ? null : readCmsSettings()), []);

  useEffect(() => {
    if (!settings?.branchId || !settings.token) {
      setState(failed(new Error('This account is not linked to an outlet yet.')));
      return;
    }

    void getLiveOrders(settings.branchId, settings.token)
      .then((orders) => {
        setOrder(orders.find((item) => documentId(item) === params.id) ?? null);
        setState(ready);
      })
      .catch((error: unknown) => setState(failed(error, 'Could not load ticket.')));
  }, [params.id]);

  async function markReady(): Promise<void> {
    if (!settings?.token || !order) return;
    setBusy(true);
    try {
      await updateOrderStatus(documentId(order), 'ready', settings.token);
      toast.success(`${formatOrderNumber(order.orderNo)} marked ready`);
      router.push('/kitchen-board');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not mark ticket ready.'));
    } finally {
      setBusy(false);
    }
  }

  function toggleItem(index: number): void {
    setCheckedItems((current) => {
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  const allChecked = order ? order.items.every((_, index) => checkedItems.has(index)) : false;

  return (
    <PageShell>
      <PageHeader
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/kitchen-board">
              <ArrowLeft />
              Back to board
            </Link>
          </Button>
        }
        description={order ? `Table ···${shortId(order.tableId)}. Tick each line as it is plated.` : 'Review the items on this ticket.'}
        eyebrow="Kitchen ticket"
        title={order ? formatOrderNumber(order.orderNo) : 'Ticket'}
      />

      {state.status === 'error' ? <ErrorState message={state.error ?? ''} /> : null}
      {state.status === 'loading' ? <LoadingRows count={3} /> : null}

      {state.status === 'ready' && !order ? (
        <EmptyState
          action={
            <Button asChild variant="outline">
              <Link href="/kitchen-board">Back to board</Link>
            </Button>
          }
          description="It may have been served or cleared from another station."
          title="Ticket not found"
        />
      ) : null}

      {order ? (
        <SectionCard
          actions={<StatusBadge kind="order" value={order.status} />}
          title={`${order.items.length} ${order.items.length === 1 ? 'line' : 'lines'}`}
        >
          <ul className="grid gap-2">
            {order.items.map((item, index) => {
              const checked = checkedItems.has(index);
              return (
                <li key={`${documentId(order)}-${item.menuItemId}-${index}`}>
                  <button
                    aria-pressed={checked}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg border bg-card px-3 py-3 text-left transition-colors',
                      'hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                      checked && 'border-success/40 bg-success-foreground/60',
                    )}
                    onClick={() => toggleItem(index)}
                    type="button"
                  >
                    {checked ? (
                      <CircleCheck aria-hidden="true" className="size-5 shrink-0 text-success" />
                    ) : (
                      <Circle aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className={cn('block font-semibold', checked && 'line-through decoration-muted-foreground/60')}>
                        {item.quantity}× {item.name}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {[item.variantLabel, item.notes].filter(Boolean).join(' · ') || 'Standard item'}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <p className="text-sm text-muted-foreground">
              {checkedItems.size} of {order.items.length} plated
            </p>
            <Button disabled={busy} onClick={() => void markReady()} type="button" variant={allChecked ? 'default' : 'outline'}>
              Mark order ready
            </Button>
          </div>
        </SectionCard>
      ) : null}
    </PageShell>
  );
}
