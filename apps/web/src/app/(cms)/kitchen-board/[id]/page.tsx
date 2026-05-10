'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { documentId, getLiveOrders, updateOrderStatus, type LiveOrder } from '../../../../lib/api-client';
import { readCmsSettings } from '../../../../lib/cms-storage';

export default function KitchenTicketPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Loading ticket...');
  const [order, setOrder] = useState<LiveOrder | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const settings = useMemo(() => (typeof window === 'undefined' ? null : readCmsSettings()), []);

  useEffect(() => {
    if (!settings?.branchId || !settings.token) {
      setMessage('Sign in to view tickets.');
      return;
    }

    void getLiveOrders(settings.branchId, settings.token)
      .then((orders) => {
        const found = orders.find((item) => documentId(item) === params.id) ?? null;
        setOrder(found);
        setMessage(found ? '' : 'Ticket not found.');
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Could not load ticket.'));
  }, [params.id]);

  async function markReady(): Promise<void> {
    if (!settings?.token || !order) return;
    setBusy(true);
    try {
      await updateOrderStatus(documentId(order), 'ready', settings.token);
      router.push('/kitchen-board');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not mark ticket ready.');
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

  return (
    <main>
      <div className="page-shell">
        <section className="customer-header">
          <div>
            <p className="eyebrow">Kitchen Ticket</p>
            <h1>{order ? `Order ${order.orderNo}` : 'Ticket Detail'}</h1>
            <p className="muted">{order ? `Table ...${order.tableId.slice(-4)} - ${order.status}` : 'Review ticket items.'}</p>
          </div>
          <Link className="button-secondary" href="/kitchen-board">Back to board</Link>
        </section>

        {message ? <p className="notice-text">{message}</p> : null}

        {order ? (
          <section className="panel">
            <div className="cms-list">
              {order.items.map((item, index) => {
                const checked = checkedItems.has(index);
                return (
                  <button
                    className="cms-list-row"
                    key={`${documentId(order)}-${item.menuItemId}-${index}`}
                    onClick={() => toggleItem(index)}
                    type="button"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined">
                      {checked ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    <div>
                      <strong>{item.quantity}x {item.name}</strong>
                      <p className="muted">{[item.variantLabel, item.notes].filter(Boolean).join(' - ') || 'Standard item'}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="action-row">
              <button disabled={busy} onClick={() => void markReady()} type="button">
                Mark order ready
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
