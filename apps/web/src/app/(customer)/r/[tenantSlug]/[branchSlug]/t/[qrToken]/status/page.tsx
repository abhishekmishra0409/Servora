'use client';

import { useEffect, useState } from 'react';

import {
  getOrderStatus,
  getPublicOrders,
  type OrderStatusSnapshot,
} from '@/lib/api-client';
import { useCustomerRoute } from '@/lib/customer-route';
import { readSubmittedOrders } from '@/lib/customer-storage';

const steps = ['pending_confirmation', 'accepted', 'preparing', 'ready', 'served', 'closed'];

const labels: Record<string, string> = {
  accepted: 'Order Accepted',
  closed: 'Closed',
  pending_confirmation: 'Waiting for Confirmation',
  preparing: 'Preparing Your Food',
  ready: 'Ready for Service',
  rejected: 'Rejected',
  served: 'Served',
};

const statusIcons: Record<string, string> = {
  accepted: 'check_circle',
  closed: 'task_alt',
  pending_confirmation: 'check_circle',
  preparing: 'skillet',
  ready: 'room_service',
  served: 'restaurant',
};

const etaByStatus: Record<string, { end: number; progress: number; start: number }> = {
  accepted: { end: 15, progress: 28, start: 12 },
  closed: { end: 0, progress: 100, start: 0 },
  pending_confirmation: { end: 15, progress: 12, start: 12 },
  preparing: { end: 8, progress: 58, start: 6 },
  ready: { end: 3, progress: 86, start: 1 },
  served: { end: 0, progress: 100, start: 0 },
};

const money = (value: number): string =>
  new Intl.NumberFormat('en-IN', { currency: 'INR', style: 'currency' }).format(value);

const etaFor = (status: string): { end: number; progress: number; start: number } =>
  etaByStatus[status] ?? { end: 15, progress: 10, start: 12 };

const formatOrderNumber = (orderNo: string): string => {
  const shortCode = orderNo.split('-').at(-1);
  return shortCode ? `#${shortCode}` : `#${orderNo}`;
};

const lineTotal = (item: OrderStatusSnapshot['items'][number]): number => {
  const addons = item.addonSnapshots.reduce((total, addon) => total + addon.priceDelta, 0);
  return item.quantity * (item.unitPrice + addons);
};

const mergeOrders = (orders: OrderStatusSnapshot[]): OrderStatusSnapshot[] => {
  const byId = new Map<string, OrderStatusSnapshot>();

  for (const order of orders) {
    byId.set(order.id, order);
  }

  return [...byId.values()].sort(
    (first, second) => new Date(second.submittedAt).getTime() - new Date(first.submittedAt).getTime(),
  );
};

export default function CustomerStatusPage() {
  const { basePath, qrToken } = useCustomerRoute();
  const [orders, setOrders] = useState<OrderStatusSnapshot[]>([]);
  const [notice, setNotice] = useState('Loading submitted orders...');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!qrToken) {
      setNotice('This customer URL is missing a QR token.');
      setError('Open a full table URL like /r/{tenant}/{branch}/t/{qrToken}.');
      return undefined;
    }

    let active = true;

    const load = async (): Promise<void> => {
      try {
        const storedOrders = readSubmittedOrders(qrToken);
        const [tableOrders, deviceOrders] = await Promise.all([
          getPublicOrders(qrToken).catch(() => [] as OrderStatusSnapshot[]),
          Promise.all(
            storedOrders.map((storedOrder) => getOrderStatus(storedOrder.orderId, qrToken).catch(() => null)),
          ),
        ]);

        if (!active) {
          return;
        }

        const nextOrders = mergeOrders([
          ...tableOrders,
          ...deviceOrders.filter((order): order is OrderStatusSnapshot => Boolean(order)),
        ]);
        setOrders(nextOrders);
        setNotice(nextOrders.length ? '' : 'No submitted orders for this table yet.');
        setError('');
      } catch (nextError) {
        if (!active) {
          return;
        }
        setError(nextError instanceof Error ? nextError.message : 'Could not load order status.');
        setNotice('Status could not be refreshed.');
      }
    };

    void load();
    const interval = window.setInterval(() => void load(), 10000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [qrToken]);

  const latestOrder = orders[0] ?? null;
  const currentIndex = latestOrder ? Math.max(0, steps.indexOf(latestOrder.status)) : -1;
  const eta = etaFor(latestOrder?.status ?? 'pending_confirmation');

  return (
    <main className="customer-main customer-main--mobile">
      <section className="customer-status-hero">
        <img
          alt="Kitchen preparation area"
          className="customer-status-hero__image"
          src="https://i.pinimg.com/736x/84/81/ab/8481ab5bd88c3c7ea5f087b3a7d99c90.jpg"
        />
        <div className="customer-status-hero__shade" />
        <div className="customer-status-hero__content">
          <span className="eyebrow">Track Order</span>
          <h1>{latestOrder ? `Order ${formatOrderNumber(latestOrder.orderNo)}` : 'Track Order'}</h1>
          <p>
            {latestOrder
              ? `Latest order placed at ${new Date(latestOrder.submittedAt).toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                })}`
              : 'Submit a bucket to start tracking progress.'}
          </p>
        </div>
      </section>

      {latestOrder ? (
        <section className="customer-status-eta">
          <div>
            <span className="eyebrow">Estimated Time</span>
            <strong>
              {eta.end ? `${eta.start} - ${eta.end}` : '0'} <span>mins</span>
            </strong>
          </div>
          <div className="customer-status-eta__icon">
            <span className="material-symbols-outlined">timer</span>
          </div>
          <div className="customer-status-eta__track" aria-hidden="true">
            <span style={{ width: `${eta.progress}%` }} />
          </div>
        </section>
      ) : null}

      {notice ? <p className="notice-text">{notice}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <section className={`customer-status-panel ${!latestOrder ? 'customer-status-panel--empty' : ''}`}>
        <h2>Latest Order Status</h2>
        <div className="customer-status-steps">
          {steps.map((step, index) => {
            const active = index <= currentIndex;
            return (
              <article className={`customer-status-step ${active ? 'active' : ''}`} key={step}>
                <span className="customer-status-step__icon">
                  <span className="material-symbols-outlined filled">
                    {statusIcons[step] ?? 'radio_button_unchecked'}
                  </span>
                </span>
                <div>
                  <strong>{labels[step]}</strong>
                  <p className="muted">
                    {step === 'pending_confirmation'
                      ? 'Your order has been securely received.'
                      : step === 'accepted'
                        ? 'The kitchen has acknowledged your request.'
                        : step === 'preparing'
                          ? 'Our culinary team is carefully crafting your meal.'
                          : step === 'ready'
                            ? 'Your food is hot and awaiting final checks.'
                            : step === 'served'
                              ? 'Enjoy your hospitality experience!'
                              : 'Your order is complete.'}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="customer-status-summary customer-status-summary--history">
        <span className="eyebrow">Submitted Orders</span>
        {orders.length ? (
          <div className="customer-status-order-list">
            {orders.map((order, orderIndex) => (
              <article className="customer-status-order-card" key={order.id}>
                <div className="customer-status-order-card__header">
                  <div>
                    <strong>
                      {orderIndex === 0 ? 'Latest' : 'Order'} {formatOrderNumber(order.orderNo)}
                    </strong>
                    <p className="muted">
                      {new Date(order.submittedAt).toLocaleString([], {
                        hour: 'numeric',
                        minute: '2-digit',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <span>{labels[order.status] ?? order.status}</span>
                </div>
                <div className="customer-status-summary__items">
                  {order.items.map((item, index) => (
                    <div
                      className="customer-status-summary__row"
                      key={`${order.id}-${item.menuItemId}-${item.variantLabel ?? 'regular'}-${index}`}
                    >
                      <div>
                        <strong>
                          {item.quantity}x {item.name}
                        </strong>
                        <p className="muted">
                          {[item.variantLabel, ...item.addonSnapshots.map((addon) => addon.label), item.notes]
                            .filter(Boolean)
                            .join(' - ') || 'No modifiers'}
                        </p>
                      </div>
                      <strong>{money(lineTotal(item))}</strong>
                    </div>
                  ))}
                </div>
                <div className="customer-status-order-card__total">
                  <span>Total</span>
                  <strong>{money(order.grandTotal)}</strong>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">No submitted order has been recorded for this table yet.</p>
        )}
      </section>

      {!latestOrder ? (
        <section className="customer-panel customer-empty-state">
          <span className="material-symbols-outlined">restaurant_menu</span>
          <h2>Ready to order?</h2>
          <p className="muted">Go back to the menu and submit your bucket to start tracking.</p>
          <a className="button-link" href={`${basePath}/menu`}>
            Back to Menu
          </a>
        </section>
      ) : null}
    </main>
  );
}
