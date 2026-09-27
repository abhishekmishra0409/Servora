'use client';

import { Check, ChefHat, CircleCheckBig, ClipboardCheck, ConciergeBell, ReceiptText, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';

import { CustomerHeading, CustomerPage } from '@/components/customer-page';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadingRows } from '@/components/loading-state';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getOrderStatus, getPublicOrders, type OrderStatusSnapshot } from '@/lib/api-client';
import { useCustomerRoute } from '@/lib/customer-route';
import { readGuestSession, readSubmittedOrders } from '@/lib/customer-storage';
import { money } from '@/lib/format';
import { formatOrderNumber } from '@/lib/order-number';
import { createSocketClient } from '@/lib/socket';
import { cn } from '@/lib/utils';

const steps: { description: string; icon: LucideIcon; key: string; label: string }[] = [
  { description: 'Your order has reached the restaurant.', icon: ClipboardCheck, key: 'pending_confirmation', label: 'Received' },
  { description: 'A team member has accepted it.', icon: Check, key: 'accepted', label: 'Accepted' },
  { description: 'The kitchen is cooking your dishes.', icon: ChefHat, key: 'preparing', label: 'Preparing' },
  { description: 'Plated and on its way to you.', icon: ConciergeBell, key: 'ready', label: 'Ready' },
  { description: 'Enjoy your meal.', icon: UtensilsCrossed, key: 'served', label: 'Served' },
  { description: 'This order is complete.', icon: CircleCheckBig, key: 'closed', label: 'Closed' },
];

const lineTotal = (item: OrderStatusSnapshot['items'][number]): number => {
  const addons = item.addonSnapshots.reduce((total, addon) => total + addon.priceDelta, 0);
  return item.quantity * (item.unitPrice + addons);
};

const mergeOrders = (orders: OrderStatusSnapshot[]): OrderStatusSnapshot[] => {
  const byId = new Map<string, OrderStatusSnapshot>();
  for (const order of orders) {
    byId.set(order.id, order);
  }
  return [...byId.values()].sort((first, second) => new Date(second.submittedAt).getTime() - new Date(first.submittedAt).getTime());
};

const timeOf = (iso: string): string => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export default function CustomerStatusPage(): ReactNode {
  const { basePath, qrToken } = useCustomerRoute();
  const [orders, setOrders] = useState<OrderStatusSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!qrToken) {
      setError('Open a full table link like /r/{tenant}/{branch}/t/{qrToken}.');
      setLoading(false);
      return undefined;
    }

    let active = true;

    const load = async (): Promise<void> => {
      try {
        const storedOrders = readSubmittedOrders(qrToken);
        const [tableOrders, deviceOrders] = await Promise.all([
          getPublicOrders(qrToken).catch(() => [] as OrderStatusSnapshot[]),
          Promise.all(storedOrders.map((storedOrder) => getOrderStatus(storedOrder.orderId, qrToken).catch(() => null))),
        ]);
        if (!active) return;
        setOrders(mergeOrders([...tableOrders, ...deviceOrders.filter((order): order is OrderStatusSnapshot => Boolean(order))]));
        setError('');
      } catch (nextError) {
        if (!active) return;
        setError(nextError instanceof Error ? nextError.message : 'Could not load order status.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    const interval = window.setInterval(() => void load(), 30000);
    const guest = readGuestSession(qrToken);
    const socket = guest?.guestToken ? createSocketClient(guest.guestToken) : null;
    socket?.on('order.status_updated', () => void load());
    socket?.on('payment.status_updated', () => void load());
    socket?.connect();

    return () => {
      active = false;
      window.clearInterval(interval);
      socket?.disconnect();
    };
  }, [qrToken]);

  const latestOrder = orders[0] ?? null;
  const rejected = latestOrder?.status === 'rejected';
  const currentIndex = latestOrder && !rejected ? Math.max(0, steps.findIndex((step) => step.key === latestOrder.status)) : -1;

  return (
    <CustomerPage>
      <CustomerHeading
        action={
          <Button asChild size="sm" variant="outline">
            <Link href={`${basePath}/bill`}>
              <ReceiptText />
              Bill
            </Link>
          </Button>
        }
        description={latestOrder ? `Latest order placed at ${timeOf(latestOrder.submittedAt)}` : 'Live updates from the kitchen'}
        title="Order status"
      />

      {error ? <ErrorState message={error} /> : null}

      {loading ? (
        <LoadingRows count={4} />
      ) : !latestOrder ? (
        <EmptyState
          action={
            <Button asChild>
              <Link href={`${basePath}/menu`}>Browse menu</Link>
            </Button>
          }
          description="Submit your bucket and progress will show up here."
          icon={ReceiptText}
          title="Nothing to track yet"
        />
      ) : (
        <>
          <Card className="gap-4 px-4 py-4 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Latest order</p>
                <h2 className="font-display text-xl font-semibold">{formatOrderNumber(latestOrder.orderNo)}</h2>
              </div>
              <StatusBadge kind="order" value={latestOrder.status} />
            </div>

            {rejected ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="status">
                This order was declined by the restaurant. Ask a team member for help or place a new order from the menu.
              </p>
            ) : (
              <ol className="space-y-0">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  const done = index < currentIndex;
                  const current = index === currentIndex;
                  const upcoming = index > currentIndex;
                  return (
                    <li className="flex gap-3" key={step.key}>
                      <div className="flex flex-col items-center">
                        <span
                          className={cn(
                            'inline-flex size-9 shrink-0 items-center justify-center rounded-full border-2',
                            done && 'border-success bg-success text-success-foreground',
                            current && 'border-primary bg-primary text-primary-foreground shadow-md shadow-primary/30',
                            upcoming && 'border-border bg-muted text-muted-foreground',
                          )}
                        >
                          {done ? <Check aria-hidden="true" className="size-4" /> : <Icon aria-hidden="true" className="size-4" />}
                        </span>
                        {index < steps.length - 1 ? (
                          <span aria-hidden="true" className={cn('w-0.5 flex-1 min-h-6', done ? 'bg-success' : 'bg-border')} />
                        ) : null}
                      </div>
                      <div className={cn('pb-5 pt-1.5', upcoming && 'opacity-60')}>
                        <p className={cn('text-sm font-semibold', current && 'text-primary')}>
                          {step.label}
                          {current ? <span className="ml-2 text-xs font-medium text-muted-foreground">Now</span> : null}
                        </p>
                        <p className="text-xs text-muted-foreground">{step.description}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground">Submitted orders</h2>
            {orders.map((order, orderIndex) => (
              <Card className="gap-0 p-0 shadow-card" key={order.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {orderIndex === 0 ? 'Latest' : 'Order'} {formatOrderNumber(order.orderNo)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.submittedAt).toLocaleString([], { day: 'numeric', hour: 'numeric', minute: '2-digit', month: 'short' })}
                      </p>
                    </div>
                    <StatusBadge kind="order" value={order.status} />
                  </div>
                  <ul className="divide-y text-sm">
                    {order.items.map((item, index) => (
                      <li className="flex items-start justify-between gap-3 py-2" key={`${order.id}-${item.menuItemId}-${index}`}>
                        <span className="min-w-0">
                          <span className="font-medium">
                            {item.quantity}× {item.name}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {[item.variantLabel, ...item.addonSnapshots.map((addon) => addon.label), item.notes].filter(Boolean).join(' · ') || 'No modifiers'}
                          </span>
                        </span>
                        <span className="shrink-0 tabular-nums">{money(lineTotal(item))}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="flex items-center justify-between border-t pt-2 text-sm">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-semibold tabular-nums">{money(order.grandTotal)}</span>
                  </p>
                </CardContent>
              </Card>
            ))}
          </section>
        </>
      )}
    </CustomerPage>
  );
}
