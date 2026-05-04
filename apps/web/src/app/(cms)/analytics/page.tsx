'use client';

import { useEffect, useState } from 'react';

import { PageShell } from '../../../components/page-shell';
import { getCmsAnalyticsMenu, getCmsAnalyticsOverview, type CmsAnalyticsOverview } from '../../../lib/api-client';
import { readCmsSettings } from '../../../lib/cms-storage';
import { createSocketClient } from '../../../lib/socket';

const money = (value: number): string =>
  new Intl.NumberFormat('en-IN', { currency: 'INR', style: 'currency' }).format(value);

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<CmsAnalyticsOverview | null>(null);
  const [items, setItems] = useState<{ available: boolean; name: string; price: number }[]>([]);
  const [message, setMessage] = useState('Sign in to load analytics from the database.');

  useEffect(() => {
    const settings = readCmsSettings();
    if (!settings.branchId || !settings.token) return;
    const load = (): void => {
      void Promise.all([
      getCmsAnalyticsOverview(settings.branchId, settings.token),
      getCmsAnalyticsMenu(settings.branchId, settings.token),
    ])
      .then(([nextOverview, menu]) => {
        setOverview(nextOverview);
        setItems(menu.items);
        setMessage('');
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Could not load analytics.'));
    };
    load();
    const socket = createSocketClient(settings.token);
    socket.on('order.created', load);
    socket.on('order.status_updated', load);
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, []);

  const metrics = overview
    ? [
        { label: 'Gross sales', value: money(overview.todayRevenue) },
        { label: 'Average basket', value: money(overview.avgBasket) },
        { label: 'Live orders', value: String(overview.liveOrders) },
        { label: 'Open requests', value: String(overview.serviceRequestsOpen) },
      ]
    : [];

  return (
    <PageShell eyebrow="Analytics" title="Operational reporting before warehouse complexity" description="Review conversion, basket size, table turnover, service timing, and menu mix from one branch-aware screen.">
      {message ? <p className="notice-text">{message}</p> : null}
      <section className="card-grid">
        {metrics.map((metric) => (
          <article className="card kpi cms-kpi" key={metric.label}><strong>{metric.value}</strong><span className="muted">{metric.label}</span></article>
        ))}
      </section>
      <section className="panel">
        <div className="cms-section-head"><h2>Menu mix</h2></div>
        <div className="cms-data-table">
          {items.map((item) => (
            <div className="cms-data-row" key={item.name}>
              <strong>{item.name}</strong><span>{money(item.price)}</span><span>{item.available ? 'Available' : 'Hidden'}</span><span className="cms-status">{item.available ? 'Live' : 'Off'}</span>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
