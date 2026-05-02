import { useEffect, useMemo, useState } from 'react';

import { documentId, getLiveOrders, updateOrderStatus, type LiveOrder } from '../lib/api-client';
import { defaultBranchId, readSession } from '../lib/session';

const money = (value: number): string =>
  new Intl.NumberFormat('en-IN', { currency: 'INR', style: 'currency' }).format(value);

export function BillRequestsPage() {
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [busyOrderId, setBusyOrderId] = useState('');
  const [message, setMessage] = useState('Loading tables ready to close...');
  const session = useMemo(() => readSession(), []);
  const branchId = useMemo(() => defaultBranchId(), []);

  async function load(): Promise<void> {
    if (!session?.accessToken || !branchId) {
      setMessage('Sign in first. Branch ID will be saved after login.');
      return;
    }
    const liveOrders = await getLiveOrders(branchId, session.accessToken);
    const readyOrders = liveOrders.filter((order) => order.status === 'ready');
    setOrders(readyOrders);
    setMessage(readyOrders.length ? '' : 'No ready orders are waiting on service or bill follow-up.');
  }

  useEffect(() => {
    void load().catch((error: Error) => setMessage(error.message));
    const interval = window.setInterval(() => void load().catch((error: Error) => setMessage(error.message)), 15000);
    return () => window.clearInterval(interval);
  }, []);

  async function markServed(order: LiveOrder): Promise<void> {
    if (!session?.accessToken) {
      setMessage('Sign in first.');
      return;
    }
    const id = documentId(order);
    setBusyOrderId(id);
    try {
      await updateOrderStatus(id, 'served', session.accessToken);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not close this follow-up.');
    } finally {
      setBusyOrderId('');
    }
  }

  return (
    <>
      <header className="waiter-page-head">
        <div>
          <h1>Bill and serve follow-up</h1>
          <p>Ready orders that need waiter handoff before the table can move toward billing.</p>
          {message ? <p className="waiter-notice">{message}</p> : null}
        </div>
        <span className="waiter-chip waiter-chip--active">
          <span className="material-symbols-outlined">payments</span>
          {orders.length} ready
        </span>
      </header>

      <section className="waiter-order-grid">
        {orders.map((order) => {
          const id = documentId(order);
          return (
            <article className="waiter-card waiter-order-card waiter-order-card--ready" key={id} style={{ borderTopColor: '#0f9f6e' }}>
              <div className="waiter-card-body">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Ready to Serve</p>
                    <h2 className="mt-1 text-xl font-bold">{order.orderNo}</h2>
                    <p className="text-sm text-secondary mt-1">Table ···{order.tableId.slice(-4)}</p>
                  </div>
                  <span className="waiter-status waiter-status--success">
                    <span className="material-symbols-outlined text-[15px]">room_service</span>
                    Ready
                  </span>
                </div>
                <ul className="waiter-line-list">
                  {order.items.map((item) => (
                    <li key={`${id}-${item.menuItemId}`}>
                      <span>{item.quantity}x {item.name}</span>
                      <span>{money(item.quantity * item.unitPrice)}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between text-xl font-bold">
                  <span>Total</span>
                  <span>{money(order.grandTotal)}</span>
                </div>
              </div>
              <div className="p-4">
                <button className="waiter-success-button w-full" disabled={busyOrderId === id} onClick={() => void markServed(order)} type="button">
                  <span className="material-symbols-outlined">check_circle</span>
                  Mark served
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}
