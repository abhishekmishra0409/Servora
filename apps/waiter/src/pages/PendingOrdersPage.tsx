import { useEffect, useMemo, useState } from 'react';

import { confirmOrder, getLiveOrders, orderId, rejectOrder, type LiveOrder } from '../lib/api-client';
import { defaultBranchId, readSession } from '../lib/session';

const money = (value: number): string =>
  new Intl.NumberFormat('en-IN', { currency: 'INR', style: 'currency' }).format(value);

export function PendingOrdersPage() {
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [message, setMessage] = useState('Loading pending orders...');
  const [busyOrderId, setBusyOrderId] = useState('');
  const session = useMemo(() => readSession(), []);
  const branchId = useMemo(() => defaultBranchId(), []);

  async function load(): Promise<void> {
    if (!session?.accessToken || !branchId) {
      setMessage('Sign in and set a branch ID first.');
      return;
    }
    try {
      const liveOrders = await getLiveOrders(branchId, session.accessToken);
      const pendingOrders = liveOrders.filter((order) =>
        order.status === 'pending_confirmation' || order.status === 'pending'
      );
      setOrders(pendingOrders);
      setMessage(pendingOrders.length ? '' : 'No orders are waiting for confirmation.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load pending orders.');
    }
  }

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 12000);
    return () => window.clearInterval(interval);
  }, []);

  async function act(order: LiveOrder, action: 'confirm' | 'reject'): Promise<void> {
    if (!session?.accessToken) {
      setMessage('Sign in first.');
      return;
    }

    const id = orderId(order);
    setBusyOrderId(id);
    try {
      if (action === 'confirm') {
        await confirmOrder(id, session.accessToken);
      } else {
        await rejectOrder(id, session.accessToken);
      }
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Order action failed.');
    } finally {
      setBusyOrderId('');
    }
  }

  return (
    <>
      <header className="waiter-page-head">
        <div>
          <h1>Pending Confirmation</h1>
          <p>Review and action new orders from tables before they enter the kitchen queue.</p>
          {message ? <p className="waiter-notice">{message}</p> : null}
        </div>
        <div className="waiter-toolbar">
          <span className="waiter-chip waiter-chip--active">
            <span className="material-symbols-outlined">receipt_long</span>
            {orders.length} pending
          </span>
          <button className="waiter-secondary-button" onClick={() => void load()} type="button">
            <span className="material-symbols-outlined">refresh</span>
            Refresh
          </button>
        </div>
      </header>

      <section className="waiter-order-grid">
        {orders.map((order, index) => {
          const id = orderId(order);
          return (
            <article className={`waiter-card waiter-order-card ${index === 0 ? 'waiter-order-card--urgent' : ''}`} key={id}>
              <div className="waiter-card-body">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined ${index === 0 ? 'text-error' : 'text-tertiary'}`}>table_restaurant</span>
                    <strong className="text-xl">Order {order.orderNo}</strong>
                  </div>
                  <span className={index === 0 ? 'waiter-status waiter-status--danger' : 'waiter-status waiter-status--neutral'}>
                    <span className="material-symbols-outlined text-[15px]">timer</span>
                    {order.submittedAt
                      ? `${Math.floor((Date.now() - new Date(order.submittedAt).getTime()) / 60000)}m ago`
                      : 'New'}
                  </span>
                </div>

                <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Order {order.orderNo}</p>
                <ul className="waiter-line-list">
                  {order.items.map((item) => (
                    <li key={`${id}-${item.menuItemId}`}>
                      <span>{item.quantity}x {item.name}</span>
                      <span>{money(item.unitPrice * item.quantity)}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between text-xl font-bold">
                  <span>Total</span>
                  <span>{money(order.grandTotal)}</span>
                </div>
              </div>
              <div className="waiter-card-actions">
                <button className="waiter-secondary-button" disabled={busyOrderId === id} onClick={() => void act(order, 'reject')} type="button">
                  <span className="material-symbols-outlined">close</span>
                  Reject
                </button>
                <button className="waiter-primary-button" disabled={busyOrderId === id} onClick={() => void act(order, 'confirm')} type="button">
                  <span className="material-symbols-outlined">check_circle</span>
                  Confirm
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}
