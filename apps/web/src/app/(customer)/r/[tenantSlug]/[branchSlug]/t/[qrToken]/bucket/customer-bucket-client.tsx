'use client';

import { ShoppingBasket, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { CartBar } from '@/components/cart-bar';
import { CustomerHeading, CustomerPage } from '@/components/customer-page';
import { EmptyState } from '@/components/empty-state';
import { ErrorState, NoticeBanner } from '@/components/error-state';
import { LoadingRows } from '@/components/loading-state';
import { QuantityStepper } from '@/components/quantity-stepper';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  ApiError,
  getTableContext,
  removeBucketItem,
  submitBucket,
  updateBucketItem,
  type GuestSession,
  type TableContext,
} from '@/lib/api-client';
import { useCustomerRoute } from '@/lib/customer-route';
import { clearGuestSession, readGuestSession, writeSubmittedOrder } from '@/lib/customer-storage';
import { money } from '@/lib/format';
import { createSocketClient } from '@/lib/socket';

export function CustomerBucketClient({
  initialContext,
  initialError = '',
  initialGuest,
}: {
  initialContext: TableContext | null;
  initialError?: string;
  initialGuest: GuestSession | null;
}): ReactNode {
  const router = useRouter();
  const { basePath, qrToken } = useCustomerRoute();
  const [context, setContext] = useState<TableContext | null>(initialContext);
  const [guest, setGuest] = useState<GuestSession | null>(initialGuest);
  const [busy, setBusy] = useState('');
  const [loading, setLoading] = useState(!initialContext && !initialError);
  const [error, setError] = useState(initialError);

  async function refresh(): Promise<void> {
    if (!qrToken) {
      setError('Open a full table link like /r/{tenant}/{branch}/t/{qrToken}.');
      return;
    }
    setContext(await getTableContext(qrToken));
  }

  useEffect(() => {
    if (!qrToken) {
      setError('Open a full table link like /r/{tenant}/{branch}/t/{qrToken}.');
      setLoading(false);
      return;
    }

    let active = true;
    const storedGuest = readGuestSession(qrToken) ?? initialGuest;
    setGuest(storedGuest);
    refresh()
      .catch((nextError: Error) => {
        if (active) setError(nextError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const socket = storedGuest?.guestToken ? createSocketClient(storedGuest.guestToken) : null;
    ['bucket.item_added', 'bucket.item_updated', 'bucket.item_removed', 'order.created', 'payment.status_updated'].forEach((event) => {
      socket?.on(event, () => {
        if (active) void refresh();
      });
    });
    socket?.connect();

    return () => {
      active = false;
      socket?.disconnect();
    };
  }, [initialGuest, qrToken]);

  function handleSessionError(nextError: unknown, fallback: string): void {
    if (nextError instanceof ApiError && nextError.status === 401 && qrToken) {
      clearGuestSession(qrToken);
      setGuest(null);
      toast.error('Your table session expired. Join the table again.');
      if (basePath) router.push(basePath);
      return;
    }
    toast.error(nextError instanceof Error ? nextError.message : fallback);
  }

  function requireSession(): string | null {
    const tableSessionId = context?.tableSession?.id ?? guest?.tableSessionId;
    if (!guest?.guestToken || !tableSessionId) {
      toast.error('Join the table before editing the bucket.');
      if (basePath) router.push(basePath);
      return null;
    }
    return tableSessionId;
  }

  async function changeQuantity(itemId: string, quantity: number): Promise<void> {
    const tableSessionId = requireSession();
    if (!tableSessionId || !guest) return;
    setBusy(itemId);
    try {
      await updateBucketItem(tableSessionId, itemId, guest.guestToken, { quantity });
      await refresh();
    } catch (nextError) {
      handleSessionError(nextError, 'Could not update this line.');
    } finally {
      setBusy('');
    }
  }

  async function removeLine(itemId: string): Promise<void> {
    const tableSessionId = requireSession();
    if (!tableSessionId || !guest) return;
    setBusy(itemId);
    try {
      await removeBucketItem(tableSessionId, itemId, guest.guestToken);
      await refresh();
    } catch (nextError) {
      handleSessionError(nextError, 'Could not remove this line.');
    } finally {
      setBusy('');
    }
  }

  async function handleSubmit(): Promise<void> {
    const tableSessionId = requireSession();
    const currentBucket = context?.tableSession?.bucket;
    if (!tableSessionId || !guest) return;
    if (!qrToken || !basePath) {
      toast.error('This table link is missing its QR token.');
      return;
    }
    if (!currentBucket?.items.length) {
      toast.error('Add at least one item before submitting.');
      return;
    }

    setBusy('submit');
    try {
      const order = await submitBucket(tableSessionId, guest.guestToken, `bucket-${tableSessionId}-${currentBucket.version}`);
      writeSubmittedOrder(qrToken, order);
      toast.success('Order sent to the kitchen');
      router.push(`${basePath}/status`);
    } catch (nextError) {
      handleSessionError(nextError, 'Could not submit the bucket.');
    } finally {
      setBusy('');
    }
  }

  const bucket = context?.tableSession?.bucket;
  const lineCount = bucket?.items.reduce((total, line) => total + line.quantity, 0) ?? 0;
  const hasSession = Boolean(context?.tableSession);

  return (
    <CustomerPage hasCartBar={lineCount > 0}>
      <CustomerHeading
        action={
          <Button asChild size="sm" variant="outline">
            <Link href={`${basePath}/menu`}>Add more</Link>
          </Button>
        }
        description={context ? `Table ${context.table.tableNo} · shared by everyone at the table` : undefined}
        title="Your bucket"
      />

      {error ? <ErrorState message={error} onRetry={() => void refresh()} /> : null}
      {!loading && context && !hasSession ? (
        <NoticeBanner>
          Join the table before building a bucket.{' '}
          <Link className="font-semibold underline" href={basePath || '/'}>
            Join now
          </Link>
        </NoticeBanner>
      ) : null}

      {loading ? (
        <LoadingRows count={3} />
      ) : !bucket?.items.length ? (
        <EmptyState
          action={
            <Button asChild>
              <Link href={`${basePath}/menu`}>Browse menu</Link>
            </Button>
          }
          description="Dishes everyone adds from the menu show up here."
          icon={ShoppingBasket}
          title="Your bucket is empty"
        />
      ) : (
        <>
          <ul className="space-y-3">
            {bucket.items.map((item) => {
              const unitPrice = item.price + (item.variantPriceDelta ?? 0) + item.addons.reduce((total, addon) => total + addon.priceDelta, 0);
              const modifiers = [item.variantLabel, ...item.addons.map((addon) => addon.label), item.notes].filter(Boolean).join(' · ');
              const isBusy = busy === item.id;
              return (
                <li key={item.id}>
                  <Card className="gap-3 px-4 py-3 shadow-card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{modifiers || 'No modifiers'}</p>
                      </div>
                      <span className="shrink-0 font-semibold tabular-nums">{money(unitPrice * item.quantity)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <QuantityStepper
                        disabled={isBusy}
                        onChange={(quantity) => void changeQuantity(item.id, quantity)}
                        size="sm"
                        value={item.quantity}
                      />
                      <Button
                        aria-label={`Remove ${item.name}`}
                        className="text-destructive hover:text-destructive"
                        disabled={isBusy}
                        onClick={() => void removeLine(item.id)}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 />
                        Remove
                      </Button>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>

          <Card className="gap-2 px-4 py-3 shadow-card">
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{money(bucket.totals.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <dt>Tax</dt>
                <dd className="tabular-nums">{money(bucket.totals.taxTotal)}</dd>
              </div>
              <div className="flex justify-between border-t pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{money(bucket.totals.grandTotal)}</dd>
              </div>
            </dl>
          </Card>
        </>
      )}

      <CartBar
        count={lineCount}
        disabled={busy === 'submit'}
        label={busy === 'submit' ? 'Sending order' : 'Submit order'}
        onClick={() => void handleSubmit()}
        total={bucket?.totals.grandTotal ?? 0}
      />
    </CustomerPage>
  );
}
