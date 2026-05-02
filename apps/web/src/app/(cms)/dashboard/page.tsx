'use client';

import { useEffect, useMemo, useState } from 'react';

import { getLiveOrders, type LiveOrder } from '../../../lib/api-client';
import { readCmsSettings, writeCmsSettings } from '../../../lib/cms-storage';

const money = (value: number): string =>
  new Intl.NumberFormat('en-IN', { currency: 'INR', style: 'currency' }).format(value);

export default function DashboardPage() {
  const [branchId, setBranchId] = useState('');
  const [token, setToken] = useState('');
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [message, setMessage] = useState('Sign in to load dashboard data from the database.');

  useEffect(() => {
    const settings = readCmsSettings();
    setBranchId(settings.branchId);
    setToken(settings.token);
    if (settings.branchId && settings.token) {
      void load(settings.branchId, settings.token);
    }
  }, []);

  const kpis = useMemo(() => {
    const pending = orders.filter((order) => order.status === 'pending_confirmation').length;
    const kitchen = orders.filter((order) => ['accepted', 'preparing', 'ready'].includes(order.status)).length;
    const ready = orders.filter((order) => order.status === 'ready').length;
    const value = orders.reduce((total, order) => total + order.grandTotal, 0);

    return [
      { label: 'Pending confirmation', value: String(pending) },
      { label: 'Kitchen queue', value: String(kitchen) },
      { label: 'Ready to serve', value: String(ready) },
      { label: 'Live order value', value: money(value) },
    ];
  }, [orders]);

  async function load(nextBranchId = branchId, nextToken = token): Promise<void> {
    if (!nextBranchId || !nextToken) {
      setOrders([]);
      setMessage('Sign in to load dashboard data from the database.');
      return;
    }
    writeCmsSettings(nextBranchId, nextToken);
    try {
      const nextOrders = await getLiveOrders(nextBranchId, nextToken);
      setOrders(nextOrders);
      setMessage(nextOrders.length ? '' : 'No live order activity yet.');
    } catch (error) {
      setOrders([]);
      setMessage(error instanceof Error ? error.message : 'Could not load dashboard data.');
    }
  }

  return (
    <main>
      <div className="page-shell">
        <section className="customer-header">
          <div>
            <p className="eyebrow">CMS Dashboard</p>
            <h1>Live Dashboard</h1>
            <p className="muted">High-density operational view from the active database order queue.</p>
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

        {message ? (
          <p className="notice-text">
            {message} <a href="/login">Go to owner login</a>
          </p>
        ) : null}

        <section className="card-grid">
          {kpis.map((kpi, index) => (
            <article className={`card kpi cms-kpi cms-kpi--${index}`} key={kpi.label}>
              <strong>{kpi.value}</strong>
              <span className="muted">{kpi.label}</span>
            </article>
          ))}
        </section>

        <section className="cms-dashboard-grid">
          <article className="panel">
            <h2>Priority orders</h2>
            <div className="cms-list">
              {orders.slice(0, 4).map((order) => (
                <div className="cms-list-row" key={order.id ?? order._id}>
                  <span className="material-symbols-outlined" aria-hidden="true">
                    receipt_long
                  </span>
                  <div>
                    <strong>{order.orderNo}</strong>
                    <p className="muted">
                      Table ···{order.tableId.slice(-4)} - {order.status.replaceAll('_', ' ')}
                    </p>
                  </div>
                  <strong>{money(order.grandTotal)}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <h2>Floor signals</h2>
            <div className="cms-list">
              {orders.slice(0, 3).map((order) => (
                <div className="cms-list-row" key={`${order.id ?? order._id}-table`}>
                  <span className="material-symbols-outlined" aria-hidden="true">
                    table_restaurant
                  </span>
                  <div>
                    <strong>Table ···{order.tableId.slice(-4)}</strong>
                    <p className="muted">{order.items.length} active items</p>
                  </div>
                  <span className="cms-status">{order.status.replaceAll('_', ' ')}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <h2>Service queue</h2>
            <div className="cms-list">
              {orders.filter((order) => order.status === 'pending_confirmation').map((order) => (
                <div className="cms-list-row" key={`${order.id ?? order._id}-service`}>
                  <span className="material-symbols-outlined" aria-hidden="true">
                    notifications_active
                  </span>
                  <div>
                    <strong>Kitchen confirmation</strong>
                    <p className="muted">{order.orderNo}</p>
                  </div>
                  <span className="cms-status">Pending</span>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
