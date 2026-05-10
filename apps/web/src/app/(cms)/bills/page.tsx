'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  documentId,
  getLiveOrders,
  markCashPaid,
  requestBill,
  updateOrderStatus,
  type LiveOrder,
} from '../../../lib/api-client';
import { readCmsSettings } from '../../../lib/cms-storage';
import { createSocketClient } from '../../../lib/socket';

const money = (value: number): string =>
  new Intl.NumberFormat('en-IN', { currency: 'INR', style: 'currency' }).format(value);

export default function BillsPage() {
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('Loading bill follow-ups...');
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const settings = useMemo(() => (typeof window === 'undefined' ? null : readCmsSettings()), []);
  const canMarkServed = ['platform_admin', 'owner', 'waiter'].includes(settings?.role ?? '');
  const canCaptureCash = ['platform_admin', 'owner', 'cashier'].includes(settings?.role ?? '');

  async function load(): Promise<void> {
    if (!settings?.branchId || !settings.token) {
      setMessage('Sign in to load bills.');
      return;
    }

    try {
      const liveOrders = await getLiveOrders(settings.branchId, settings.token);
      const billable = liveOrders.filter((order) => ['ready', 'served'].includes(order.status));
      setOrders(billable);
      setMessage(billable.length ? '' : 'No ready or served orders are waiting for bill follow-up.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load bill follow-ups.');
    }
  }

  useEffect(() => {
    void load();
    const socket = settings?.token ? createSocketClient(settings.token) : null;
    socket?.on('order.status_updated', () => void load());
    socket?.on('payment.bill_requested', () => void load());
    socket?.connect();
    const interval = window.setInterval(() => void load(), 30000);
    return () => {
      window.clearInterval(interval);
      socket?.disconnect();
    };
  }, []);

  async function markServedAndBill(order: LiveOrder): Promise<void> {
    if (!settings?.token) return;
    const id = documentId(order);
    setBusy(id);
    try {
      if (canMarkServed && order.status === 'ready') {
        await updateOrderStatus(id, 'served', settings.token);
      }
      await requestBill(id, settings.token);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update bill follow-up.');
    } finally {
      setBusy('');
    }
  }

  async function markOrderCashPaid(order: LiveOrder): Promise<void> {
    if (!settings?.token) return;
    const id = documentId(order);
    setBusy(id);
    try {
      const payment = await requestBill(id, settings.token);
      await markCashPaid(documentId(payment), settings.token);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not capture cash payment.');
    } finally {
      setBusy('');
    }
  }

  return (
    <main>
      <div className="page-shell">
        <section className="customer-header">
          <div>
            <p className="eyebrow">Bills</p>
            <h1>Bill and Serve Follow-Up</h1>
            <p className="muted">Ready and served orders that need table closeout or payment follow-up.</p>
          </div>
          <button onClick={() => void load()} type="button">
            <span aria-hidden="true" className="material-symbols-outlined">refresh</span>
            Refresh
          </button>
        </section>

        {message ? <p className="notice-text">{message}</p> : null}

        <section className="card-grid">
          {orders.map((order) => {
            const id = documentId(order);
            return (
              <article className="card" key={id}>
                <div className="cms-ticket__head">
                  <strong>{order.orderNo}</strong>
                  <span>{order.status.replaceAll('_', ' ')}</span>
                </div>
                <p className="muted">Table ...{order.tableId.slice(-4)}</p>
                <ul>
                  {order.items.map((item, index) => (
                    <li key={`${id}-${item.menuItemId}-${index}`}>
                      {item.quantity}x {item.name}
                    </li>
                  ))}
                </ul>
                <strong>{money(order.grandTotal)}</strong>
                <button disabled={busy === id} onClick={() => void markServedAndBill(order)} type="button">
                  {canMarkServed && order.status === 'ready' ? 'Mark served and request bill' : 'Request bill'}
                </button>
                {canCaptureCash && order.status === 'served' ? (
                  <button className="button-secondary" disabled={busy === id} onClick={() => void markOrderCashPaid(order)} type="button">
                    Mark cash paid
                  </button>
                ) : null}
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
