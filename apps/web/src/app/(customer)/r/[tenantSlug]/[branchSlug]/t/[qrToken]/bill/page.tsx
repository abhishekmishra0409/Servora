'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { PageShell } from '@/components/page-shell';
import {
  getPublicOrderPayment,
  getPublicOrders,
  type OrderStatusSnapshot,
  type PaymentSnapshot,
} from '@/lib/api-client';
import { useCustomerRoute } from '@/lib/customer-route';
import { readGuestSession } from '@/lib/customer-storage';
import { formatOrderNumber } from '@/lib/order-number';
import { createSocketClient } from '@/lib/socket';

type BillRow = {
  order: OrderStatusSnapshot;
  payment: PaymentSnapshot | null;
};

const money = (value: number): string =>
  new Intl.NumberFormat('en-IN', { currency: 'INR', style: 'currency' }).format(value);

const statusLabel = (value?: string): string => (value ? value.replaceAll('_', ' ') : 'awaiting bill');

export default function CustomerBillPage() {
  const { basePath, qrToken } = useCustomerRoute();
  const [rows, setRows] = useState<BillRow[]>([]);
  const [message, setMessage] = useState('Loading bill status...');

  const totals = useMemo(() => {
    const total = rows.reduce((sum, row) => sum + row.order.grandTotal, 0);
    const paid = rows
      .filter((row) => row.payment?.status === 'captured')
      .reduce((sum, row) => sum + (row.payment?.amount ?? row.order.grandTotal), 0);

    return {
      due: Math.max(total - paid, 0),
      paid,
      total,
    };
  }, [rows]);

  useEffect(() => {
    if (!qrToken) {
      setMessage('This customer URL is missing a QR token.');
      return;
    }

    let active = true;
    const load = (): void => {
      void getPublicOrders(qrToken)
        .then(async (orders) => {
          const payments = await Promise.all(
            orders.map((order) => getPublicOrderPayment(order.id, qrToken).catch(() => null)),
          );
          if (!active) {
            return;
          }

          setRows(orders.map((order, index) => ({ order, payment: payments[index] ?? null })));
          setMessage(orders.length ? '' : 'No submitted orders yet.');
        })
        .catch((error: unknown) => {
          if (!active) {
            return;
          }
          setMessage(error instanceof Error ? error.message : 'Could not load bill status.');
        });
    };

    load();
    const interval = window.setInterval(load, 30_000);
    const guest = readGuestSession(qrToken);
    const socket = guest?.guestToken ? createSocketClient(guest.guestToken) : null;
    socket?.on('order.created', load);
    socket?.on('order.status_updated', load);
    socket?.on('payment.status_updated', load);
    socket?.connect();

    return () => {
      active = false;
      window.clearInterval(interval);
      socket?.disconnect();
    };
  }, [qrToken]);

  return (
    <PageShell
      eyebrow="Bill"
      title="Bill and payment status"
      description="See every submitted order, current settlement state, and the remaining table balance."
    >
      {message ? <p className="notice-text">{message}</p> : null}

      <section className="card-grid">
        <article className="card kpi">
          <strong>{money(totals.total)}</strong>
          <span className="muted">Table total</span>
        </article>
        <article className="card kpi">
          <strong>{money(totals.paid)}</strong>
          <span className="muted">Paid</span>
        </article>
        <article className="card kpi">
          <strong>{money(totals.due)}</strong>
          <span className="muted">Due</span>
        </article>
      </section>

      <section className="panel">
        <div className="cms-list">
          {rows.map(({ order, payment }) => (
            <div className="cms-list-row" key={order.id}>
              <span aria-hidden="true" className="material-symbols-outlined">
                receipt_long
              </span>
              <div>
                <strong>{formatOrderNumber(order.orderNo)}</strong>
                <p className="muted">
                  {order.items.length} items - order {statusLabel(order.status)} - payment {statusLabel(payment?.status)}
                </p>
              </div>
              <strong>{money(payment?.amount ?? order.grandTotal)}</strong>
            </div>
          ))}
        </div>
      </section>

      {basePath ? (
        <div className="action-row">
          <Link href={`${basePath}/service`}>
            <span aria-hidden="true" className="material-symbols-outlined">
              front_hand
            </span>
            Request bill help
          </Link>
          <Link href={`${basePath}/status`}>
            <span aria-hidden="true" className="material-symbols-outlined">
              receipt_long
            </span>
            Order status
          </Link>
        </div>
      ) : null}
    </PageShell>
  );
}
