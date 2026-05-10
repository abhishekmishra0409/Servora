'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import {
  documentId,
  getLiveOrders,
  updateOrderStatus,
  type LiveOrder,
} from '../../../lib/api-client';
import { readCmsSettings } from '../../../lib/cms-storage';
import { createSocketClient } from '../../../lib/socket';

const lanes = [
  { label: 'Accepted', next: 'preparing', nextLabel: 'Start preparing', status: 'accepted' },
  { label: 'Preparing', next: 'ready', nextLabel: 'Mark ready', status: 'preparing' },
  { label: 'Ready', next: 'served', nextLabel: 'Clear ticket', status: 'ready' },
];

function elapsed(submittedAt?: string): string {
  if (!submittedAt) return 'New';
  const minutes = Math.floor((Date.now() - new Date(submittedAt).getTime()) / 60000);
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export default function KitchenBoardPage() {
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('Loading kitchen queue...');

  const settings = useMemo(() => (typeof window === 'undefined' ? null : readCmsSettings()), []);

  async function load(): Promise<void> {
    if (!settings?.branchId || !settings.token) {
      setMessage('Sign in to load the kitchen board.');
      return;
    }

    try {
      const nextOrders = await getLiveOrders(settings.branchId, settings.token);
      const kitchenOrders = nextOrders.filter((order) => ['accepted', 'preparing', 'ready'].includes(order.status));
      setOrders(kitchenOrders);
      setMessage(kitchenOrders.length ? '' : 'No active kitchen tickets.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load kitchen tickets.');
    }
  }

  useEffect(() => {
    void load();
    const socket = settings?.token ? createSocketClient(settings.token) : null;
    socket?.on('order.created', () => void load());
    socket?.on('order.status_updated', () => void load());
    socket?.connect();
    const interval = window.setInterval(() => void load(), 30000);
    return () => {
      window.clearInterval(interval);
      socket?.disconnect();
    };
  }, []);

  async function advance(order: LiveOrder, nextStatus: string): Promise<void> {
    if (!settings?.token) return;
    const id = documentId(order);
    setBusy(id);
    try {
      await updateOrderStatus(id, nextStatus, settings.token);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update ticket.');
    } finally {
      setBusy('');
    }
  }

  return (
    <main>
      <div className="page-shell">
        <section className="customer-header">
          <div>
            <p className="eyebrow">Kitchen</p>
            <h1>Kitchen Board</h1>
            <p className="muted">Accepted, preparing, and ready tickets from the live branch queue.</p>
          </div>
          <button onClick={() => void load()} type="button">
            <span aria-hidden="true" className="material-symbols-outlined">refresh</span>
            Refresh
          </button>
        </section>

        {message ? <p className="notice-text">{message}</p> : null}

        <section className="cms-kanban">
          {lanes.map((lane) => {
            const laneOrders = orders.filter((order) => order.status === lane.status);

            return (
              <article className="cms-column" key={lane.status}>
                <header>
                  <h2>{lane.label}</h2>
                  <span>{laneOrders.length}</span>
                </header>
                {laneOrders.map((order) => {
                  const id = documentId(order);
                  return (
                    <div className="cms-ticket" key={id}>
                      <div className="cms-ticket__head">
                        <strong>{order.orderNo}</strong>
                        <span>{elapsed(order.submittedAt)}</span>
                      </div>
                      <p className="muted">Table ...{order.tableId.slice(-4)}</p>
                      <ul>
                        {order.items.map((item, index) => (
                          <li key={`${id}-${item.menuItemId}-${index}`}>
                            <span>{item.quantity}x {item.name}</span>
                            <span>{item.variantLabel ?? ''}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="action-row">
                        <Link className="button-secondary" href={`/kitchen-board/${id}`}>
                          View ticket
                        </Link>
                        <button disabled={busy === id} onClick={() => void advance(order, lane.next)} type="button">
                          {lane.nextLabel}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
