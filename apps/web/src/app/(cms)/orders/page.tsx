'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  confirmOrder,
  documentId,
  getLiveOrders,
  rejectOrder,
  updateOrderStatus,
  type LiveOrder,
} from '../../../lib/api-client';
import { readCmsSettings, writeCmsSettings } from '../../../lib/cms-storage';
import { formatOrderNumber } from '../../../lib/order-number';
import { createSocketClient } from '../../../lib/socket';

const statuses = ['pending_confirmation', 'accepted', 'preparing', 'ready'];

const money = (value: number): string =>
  new Intl.NumberFormat('en-IN', { currency: 'INR', style: 'currency' }).format(value);

export default function OrdersPage() {
  const [branchId, setBranchId] = useState('');
  const [token, setToken] = useState('');
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('Sign in to load live orders from the database.');

  useEffect(() => {
    const settings = readCmsSettings();
    setBranchId(settings.branchId);
    setToken(settings.token);
    if (settings.branchId && settings.token) {
      void load(settings.branchId, settings.token);
    }
    const socket = settings.token ? createSocketClient(settings.token) : null;
    socket?.on('order.created', () => void load(settings.branchId, settings.token));
    socket?.on('order.status_updated', () => void load(settings.branchId, settings.token));
    socket?.connect();
    return () => {
      socket?.disconnect();
    };
  }, []);

  const grouped = useMemo(
    () =>
      statuses.map((status) => ({
        orders: orders.filter((order) => order.status === status),
        status,
      })),
    [orders],
  );

  async function load(nextBranchId = branchId, nextToken = token): Promise<void> {
    if (!nextBranchId || !nextToken) {
      setOrders([]);
      setMessage('Sign in to load live orders from the database.');
      return;
    }
    writeCmsSettings(nextBranchId, nextToken);
    try {
      const nextOrders = await getLiveOrders(nextBranchId, nextToken);
      setOrders(nextOrders);
      setMessage(nextOrders.length ? '' : 'No live orders for this branch.');
    } catch (error) {
      setOrders([]);
      setMessage(error instanceof Error ? error.message : 'Could not load live orders.');
    }
  }

  async function act(order: LiveOrder, action: 'confirm' | 'reject' | 'preparing' | 'ready' | 'served'): Promise<void> {
    const id = documentId(order);
    setBusy(id);
    try {
      if (action === 'confirm') {
        await confirmOrder(id, token);
      } else if (action === 'reject') {
        await rejectOrder(id, token);
      } else {
        await updateOrderStatus(id, action, token);
      }
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Order action failed.');
    } finally {
      setBusy('');
    }
  }

  return (
    <main>
      <div className="page-shell">
        <section className="customer-header">
          <div>
            <p className="eyebrow">Orders</p>
            <h1>Live Orders</h1>
            <p className="muted">Confirm, reject, and move active tickets through service.</p>
          </div>
          <button onClick={() => void load()} type="button">
            <span aria-hidden="true" className="material-symbols-outlined">
              refresh
            </span>
            Refresh
          </button>
        </section>

        <section className="toolbar compact-toolbar">
          <input onChange={(event) => setBranchId(event.target.value)} placeholder="Branch ID" value={branchId} />
          <input onChange={(event) => setToken(event.target.value)} placeholder="Staff access token" value={token} />
        </section>

        {message ? <p className="notice-text">{message}</p> : null}

        <section className="cms-kanban">
          {grouped.map((group) => (
            <article className="cms-column" key={group.status}>
              <header>
                <h2>{group.status.replaceAll('_', ' ')}</h2>
                <span>{group.orders.length}</span>
              </header>
              {group.orders.map((order) => {
                const id = documentId(order);
                return (
                  <div className="cms-ticket" key={id}>
                    <div>
                      <div className="cms-ticket__head">
                        <strong>{formatOrderNumber(order.orderNo)}</strong>
                        <span>Table ···{order.tableId.slice(-4)}</span>
                      </div>
                      <ul>
                        {order.items.map((item, index) => (
                          <li key={`${id}-${item.menuItemId}-${index}`}>
                            <span>{item.quantity}x {item.name}</span>
                            <span>{money(item.quantity * item.unitPrice)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <strong className="cms-ticket__total">{money(order.grandTotal)}</strong>
                    <div className="action-row">
                      {order.status === 'pending_confirmation' ? (
                        <>
                          <button disabled={busy === id} onClick={() => void act(order, 'confirm')} type="button">
                            Confirm
                          </button>
                          <button
                            className="danger-button"
                            disabled={busy === id}
                            onClick={() => void act(order, 'reject')}
                            type="button"
                          >
                            Reject
                          </button>
                        </>
                      ) : null}
                      {order.status === 'accepted' ? (
                        <button disabled={busy === id} onClick={() => void act(order, 'preparing')} type="button">
                          Preparing
                        </button>
                      ) : null}
                      {order.status === 'preparing' ? (
                        <button disabled={busy === id} onClick={() => void act(order, 'ready')} type="button">
                          Ready
                        </button>
                      ) : null}
                      {order.status === 'ready' ? (
                        <button disabled={busy === id} onClick={() => void act(order, 'served')} type="button">
                          Served
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
