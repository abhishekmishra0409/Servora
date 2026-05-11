'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  documentId,
  getBills,
  markPaymentPaid,
  requestBill,
  type CmsBill,
  type PaymentSnapshot,
} from '../../../lib/api-client';
import { readCmsSettings } from '../../../lib/cms-storage';
import { formatOrderNumber } from '../../../lib/order-number';
import { createSocketClient } from '../../../lib/socket';

const COMPLETED_PAGE_SIZE = 6;

const money = (value: number): string =>
  new Intl.NumberFormat('en-IN', { currency: 'INR', style: 'currency' }).format(value);

export default function BillsPage() {
  const [busy, setBusy] = useState('');
  const [completedPage, setCompletedPage] = useState(1);
  const [message, setMessage] = useState('Loading bill follow-ups...');
  const [bills, setBills] = useState<CmsBill[]>([]);
  const settings = useMemo(() => (typeof window === 'undefined' ? null : readCmsSettings()), []);
  const canCapturePayment = ['platform_admin', 'owner', 'manager', 'waiter', 'cashier'].includes(settings?.role ?? '');
  const activeBills = useMemo(() => bills.filter((bill) => bill.status !== 'captured'), [bills]);
  const completedBills = useMemo(() => bills.filter((bill) => bill.status === 'captured'), [bills]);
  const completedTotalPages = Math.max(1, Math.ceil(completedBills.length / COMPLETED_PAGE_SIZE));
  const paginatedCompletedBills = useMemo(() => {
    const start = (completedPage - 1) * COMPLETED_PAGE_SIZE;
    return completedBills.slice(start, start + COMPLETED_PAGE_SIZE);
  }, [completedBills, completedPage]);

  async function load(): Promise<void> {
    if (!settings?.branchId || !settings.token) {
      setMessage('Sign in to load bills.');
      return;
    }

    try {
      const nextBills = await getBills(settings.branchId, settings.token);
      setBills(nextBills);
      setMessage(nextBills.length ? '' : 'No table bills found for this branch yet.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load bill follow-ups.');
    }
  }

  useEffect(() => {
    if (completedPage > completedTotalPages) {
      setCompletedPage(completedTotalPages);
    }
  }, [completedPage, completedTotalPages]);

  useEffect(() => {
    void load();
    const socket = settings?.token ? createSocketClient(settings.token) : null;
    socket?.on('order.status_updated', () => void load());
    socket?.on('payment.bill_requested', () => void load());
    socket?.on('payment.status_updated', () => void load());
    socket?.on('table.status_changed', () => void load());
    socket?.on('service_request.created', () => void load());
    socket?.connect();
    const interval = window.setInterval(() => void load(), 30000);
    return () => {
      window.clearInterval(interval);
      socket?.disconnect();
    };
  }, []);

  function billKey(bill: CmsBill): string {
    return bill.paymentId ?? bill.id ?? bill._id ?? bill.tableSessionId;
  }

  function paymentIdFor(bill: CmsBill): string {
    return bill.paymentId ?? bill.id ?? bill._id ?? '';
  }

  async function ensureBillPayment(bill: CmsBill): Promise<PaymentSnapshot> {
    const existingPaymentId = paymentIdFor(bill);
    if (existingPaymentId) {
      return { amount: bill.amount, currency: bill.currency, id: existingPaymentId, method: bill.method, orderIds: bill.orderIds, provider: bill.provider, status: bill.status, tableId: bill.tableId, tableSessionId: bill.tableSessionId };
    }

    const firstOrder = bill.orders[0];
    if (!firstOrder) {
      throw new Error('No orders found for this table bill.');
    }

    return requestBill(documentId(firstOrder), settings?.token ?? '');
  }

  async function generateBill(bill: CmsBill): Promise<void> {
    if (!settings?.token) return;
    const id = billKey(bill);
    setBusy(id);
    try {
      await ensureBillPayment(bill);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update bill follow-up.');
    } finally {
      setBusy('');
    }
  }

  async function markBillPaid(bill: CmsBill, method: string): Promise<void> {
    if (!settings?.token) return;
    const id = billKey(bill);
    setBusy(id);
    try {
      const payment = await ensureBillPayment(bill);
      await markPaymentPaid(documentId(payment), method, settings.token);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not capture payment.');
    } finally {
      setBusy('');
    }
  }

  function orderItemsSummary(bill: CmsBill): string {
    return bill.orders
      .flatMap((order) => order.items.map((item) => `${item.quantity}x ${item.name}`))
      .join(', ');
  }

  function itemDetailLabel(item: CmsBill['orders'][number]['items'][number]): string {
    const addonText = item.addonSnapshots.length
      ? ` + ${item.addonSnapshots.map((addon) => addon.label).join(', ')}`
      : '';
    const variantText = item.variantLabel ? ` (${item.variantLabel})` : '';
    return `${item.quantity}x ${item.name}${variantText}${addonText}`;
  }

  return (
    <main>
      <div className="page-shell">
        <section className="customer-header">
          <div>
            <p className="eyebrow">Bills</p>
            <h1>Table Session Bills</h1>
            <p className="muted">Orders from the same table session, grouped into one closeout bill.</p>
          </div>
          <button onClick={() => void load()} type="button">
            <span aria-hidden="true" className="material-symbols-outlined">refresh</span>
            Refresh
          </button>
        </section>

        {message ? <p className="notice-text">{message}</p> : null}

        <section>
          <div className="cms-section-head">
            <h2>Pending Bills</h2>
            <span className="cms-status">{activeBills.length} open</span>
          </div>
          {!activeBills.length ? (
            <p className="muted">No pending bills right now. Completed bills are listed below.</p>
          ) : null}
        </section>

        <section className="card-grid">
          {activeBills.map((bill) => {
            const id = billKey(bill);
            const paymentRequested = bill.status !== 'not_requested';
            return (
              <article className="card bill-card" key={id}>
                <div className="cms-ticket__head">
                  <strong>Table ...{bill.tableId.slice(-4)}</strong>
                  <span className="cms-status bill-card__status">{bill.status.replaceAll('_', ' ')}</span>
                </div>
                <p className="muted">{bill.orders.length} orders in this table session</p>
                {bill.status === 'captured' ? (
                  <p className="muted">Paid by {bill.method.replaceAll('_', ' ')}</p>
                ) : null}
                <div className="cms-list">
                  {bill.orders.map((order) => (
                    <div className="cms-list-row bill-order-row" key={documentId(order)}>
                      <span aria-hidden="true" className="material-symbols-outlined">receipt_long</span>
                      <div>
                        <strong>{formatOrderNumber(order.orderNo)}</strong>
                        <p className="muted">{order.status.replaceAll('_', ' ')} - {order.items.length} items</p>
                        {order.items.length ? (
                          <ul className="bill-item-list">
                            {order.items.map((item) => (
                              <li key={`${item.menuItemId}-${item.name}-${item.quantity}-${item.unitPrice}`}>
                                {itemDetailLabel(item)}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                      <strong className="bill-order-row__amount">{money(order.grandTotal)}</strong>
                    </div>
                  ))}
                </div>
                <div className="bill-card__footer">
                  <div className="bill-card__total">
                    <span>Total due</span>
                    <strong>{money(bill.amount)}</strong>
                  </div>
                  <div className="bill-card__actions">
                    {!paymentRequested ? (
                      <button disabled={busy === id} onClick={() => void generateBill(bill)} type="button">
                        <span aria-hidden="true" className="material-symbols-outlined">receipt_long</span>
                        Generate bill
                      </button>
                    ) : null}
                    {canCapturePayment && paymentRequested && bill.status !== 'captured' ? (
                      <div className="bill-card__payment-actions" aria-label="Capture payment">
                        <button className="button-secondary" disabled={busy === id} onClick={() => void markBillPaid(bill, 'cash')} type="button">
                          <span aria-hidden="true" className="material-symbols-outlined">payments</span>
                          Cash
                        </button>
                        <button className="button-secondary" disabled={busy === id} onClick={() => void markBillPaid(bill, 'card')} type="button">
                          <span aria-hidden="true" className="material-symbols-outlined">credit_card</span>
                          Card
                        </button>
                        <button className="button-secondary" disabled={busy === id} onClick={() => void markBillPaid(bill, 'upi')} type="button">
                          <span aria-hidden="true" className="material-symbols-outlined">qr_code_2</span>
                          UPI
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <section className="panel">
          <div className="cms-section-head">
            <h2>Completed Bills</h2>
            <span className="cms-status">{completedBills.length} captured</span>
          </div>
          {!completedBills.length ? (
            <p className="muted">No completed bills yet.</p>
          ) : (
            <>
              <div className="cms-list">
                {paginatedCompletedBills.map((bill) => {
                  const tableLabel = bill.tableId ? `...${bill.tableId.slice(-4)}` : 'unknown';
                  return (
                    <article className="cms-list-row bill-completed-row" key={billKey(bill)}>
                      <span aria-hidden="true" className="material-symbols-outlined">task_alt</span>
                      <div>
                        <strong>Table {tableLabel} · {money(bill.amount)}</strong>
                        <p className="muted">
                          Paid by {bill.method.replaceAll('_', ' ')} · {bill.orders.length} orders · {orderItemsSummary(bill) || 'No items'}
                        </p>
                      </div>
                      <span className="cms-status">captured</span>
                    </article>
                  );
                })}
              </div>
              <div className="action-row bill-pagination-row">
                <button
                  className="button-secondary"
                  disabled={completedPage <= 1}
                  onClick={() => setCompletedPage((current) => Math.max(1, current - 1))}
                  type="button"
                >
                  Previous
                </button>
                <p className="muted">Page {completedPage} of {completedTotalPages}</p>
                <button
                  className="button-secondary"
                  disabled={completedPage >= completedTotalPages}
                  onClick={() => setCompletedPage((current) => Math.min(completedTotalPages, current + 1))}
                  type="button"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
