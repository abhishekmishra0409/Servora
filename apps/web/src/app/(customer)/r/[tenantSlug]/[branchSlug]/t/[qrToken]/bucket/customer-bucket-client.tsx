'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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

const money = (value: number): string =>
  new Intl.NumberFormat('en-IN', { currency: 'INR', style: 'currency' }).format(value);

export function CustomerBucketClient({
  initialContext,
  initialError = '',
  initialGuest,
}: {
  initialContext: TableContext | null;
  initialError?: string;
  initialGuest: GuestSession | null;
}) {
  const router = useRouter();
  const { basePath, qrToken } = useCustomerRoute();
  const [context, setContext] = useState<TableContext | null>(initialContext);
  const [guest, setGuest] = useState<GuestSession | null>(initialGuest);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState(
    initialContext ? (initialContext.tableSession ? '' : 'Join the table before building a bucket.') : initialError || 'Loading bucket...',
  );
  const [error, setError] = useState(initialError);

  async function refresh(): Promise<void> {
    if (!qrToken) {
      setNotice('This customer URL is missing a QR token.');
      setError('Open a full table URL like /r/{tenant}/{branch}/t/{qrToken}.');
      return;
    }

    const nextContext = await getTableContext(qrToken);
    setContext(nextContext);
    setNotice(nextContext.tableSession ? '' : 'Join the table before building a bucket.');
  }

  useEffect(() => {
    if (!qrToken) {
      setNotice('This customer URL is missing a QR token.');
      setError('Open a full table URL like /r/{tenant}/{branch}/t/{qrToken}.');
      return;
    }

    let active = true;
    setGuest(readGuestSession(qrToken) ?? initialGuest);
    refresh().catch((nextError: Error) => {
      if (!active) {
        return;
      }
      setError(nextError.message);
      setNotice('Bucket could not be loaded.');
    });

    return () => {
      active = false;
    };
  }, [initialGuest, qrToken]);

  function handleSessionError(nextError: unknown, fallback: string): void {
    if (nextError instanceof ApiError && nextError.status === 401 && qrToken) {
      clearGuestSession(qrToken);
      setGuest(null);
      setError('Your table session expired. Join the table again.');
      if (basePath) {
        router.push(basePath);
      }
      return;
    }

    setError(nextError instanceof Error ? nextError.message : fallback);
  }

  async function changeQuantity(itemId: string, quantity: number): Promise<void> {
    const tableSessionId = context?.tableSession?.id ?? guest?.tableSessionId;

    if (!guest?.guestToken || !tableSessionId) {
      setError('Join the table before editing the bucket.');
      if (basePath) {
        router.push(basePath);
      }
      return;
    }

    setBusy(itemId);
    setError('');
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
    const tableSessionId = context?.tableSession?.id ?? guest?.tableSessionId;

    if (!guest?.guestToken || !tableSessionId) {
      setError('Join the table before editing the bucket.');
      if (basePath) {
        router.push(basePath);
      }
      return;
    }

    setBusy(itemId);
    setError('');
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
    const tableSessionId = context?.tableSession?.id ?? guest?.tableSessionId;
    const currentBucket = context?.tableSession?.bucket;

    if (!guest?.guestToken || !tableSessionId) {
      setError('Join the table before submitting.');
      if (basePath) {
        router.push(basePath);
      }
      return;
    }
    if (!qrToken || !basePath) {
      setError('This customer URL is missing a QR token.');
      return;
    }
    if (!currentBucket?.items.length) {
      setError('Add at least one item before submitting.');
      return;
    }

    setBusy('submit');
    setError('');
    try {
      const order = await submitBucket(
        tableSessionId,
        guest.guestToken,
        `bucket-${tableSessionId}-${currentBucket.version}`,
      );
      writeSubmittedOrder(qrToken, order);
      router.push(`${basePath}/status`);
    } catch (nextError) {
      handleSessionError(nextError, 'Could not submit the bucket.');
    } finally {
      setBusy('');
    }
  }

  const bucket = context?.tableSession?.bucket;

  return (
    <main className="customer-main customer-main--mobile">
      <section className="customer-header">
        <div>
          <h1>Your Bucket</h1>
          <p className="muted">{context ? `Table ${context.table.tableNo}` : 'Shared Bucket'}</p>
        </div>
        <a className="button-secondary" href={`${basePath}/menu`}>
          Back to Menu
        </a>
      </section>

      <section className="customer-panel customer-summary-banner">
        <div>
          <span className="eyebrow">Review</span>
          <h2>Your Bucket</h2>
          <p className="muted">Review your items before submitting.</p>
        </div>
        <p className="muted customer-summary-banner__note">{bucket?.items.length ? `${bucket.items.length} item${bucket.items.length === 1 ? '' : 's'} ready` : 'No items added yet.'}</p>
      </section>

      {notice ? <p className="notice-text">{notice}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {!bucket?.items.length ? (
        <section className="customer-panel customer-empty-state">
          <h2>Your bucket is empty</h2>
          <p className="muted">Add dishes from the menu to build your order.</p>
          <a className="button-link" href={`${basePath}/menu`}>
            Browse Menu
          </a>
        </section>
      ) : null}

      <section className="bucket-list">
        {bucket?.items.map((item) => {
          const unitPrice =
            item.price +
            (item.variantPriceDelta ?? 0) +
            item.addons.reduce((total, addon) => total + addon.priceDelta, 0);
          return (
            <article className="line-card" key={item.id}>
              <div>
                <h2>{item.name}</h2>
                <p className="muted">
                  {[item.variantLabel, ...item.addons.map((addon) => addon.label), item.notes]
                    .filter(Boolean)
                    .join(' - ') || 'No modifiers'}
                </p>
              </div>
              <div className="quantity-row">
                <button
                  disabled={busy === item.id}
                  onClick={() => void changeQuantity(item.id, Math.max(1, item.quantity - 1))}
                  type="button"
                >
                  <span className="material-symbols-outlined">remove</span>
                </button>
                <span>{item.quantity}</span>
                <button
                  disabled={busy === item.id}
                  onClick={() => void changeQuantity(item.id, item.quantity + 1)}
                  type="button"
                >
                  <span className="material-symbols-outlined">add</span>
                </button>
              </div>
              <strong>{money(unitPrice * item.quantity)}</strong>
              <button className="danger-button" disabled={busy === item.id} onClick={() => void removeLine(item.id)} type="button">
                <span className="material-symbols-outlined">delete</span>
                Remove
              </button>
            </article>
          );
        })}
      </section>

      <section className="total-bar">
        <div>
          <span className="muted">Subtotal</span>
          <strong>{money(bucket?.totals.subtotal ?? 0)}</strong>
        </div>
        <div>
          <span className="muted">Tax</span>
          <strong>{money(bucket?.totals.taxTotal ?? 0)}</strong>
        </div>
        <div>
          <span className="muted">Total</span>
          <strong>{money(bucket?.totals.grandTotal ?? 0)}</strong>
        </div>
        <button
          className="customer-submit"
          disabled={busy === 'submit' || !bucket?.items.length}
          onClick={() => void handleSubmit()}
          type="button"
        >
          {busy === 'submit' ? (
            'Submitting...'
          ) : (
            <>
              Submit Order
              <span className="material-symbols-outlined">send</span>
            </>
          )}
        </button>
      </section>
    </main>
  );
}
