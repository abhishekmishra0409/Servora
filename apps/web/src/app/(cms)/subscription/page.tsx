'use client';

import { useEffect, useState } from 'react';

import { PageShell } from '../../../components/page-shell';
import { getCmsBillingSummary, type CmsBillingSummary } from '../../../lib/api-client';
import { readCmsSettings } from '../../../lib/cms-storage';

const money = (value: number): string =>
  new Intl.NumberFormat('en-IN', { currency: 'INR', style: 'currency' }).format(value);

export default function SubscriptionPage() {
  const [summary, setSummary] = useState<CmsBillingSummary | null>(null);
  const [message, setMessage] = useState('Sign in to load subscription data from the database.');

  useEffect(() => {
    const settings = readCmsSettings();
    if (!settings.tenantId || !settings.token) return;
    void getCmsBillingSummary(settings.tenantId, settings.token)
      .then((nextSummary) => {
        setSummary(nextSummary);
        setMessage(nextSummary.subscription ? '' : 'No subscription record found.');
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Could not load subscription.'));
  }, []);

  return (
    <PageShell eyebrow="Subscription" title="Branch growth without per-order penalties" description="Keep plans, invoices, renewals, and add-ons self-serve through the billing provider abstraction.">
      {message ? <p className="notice-text">{message}</p> : null}
      <section className="cms-settings-grid">
        <article className="panel"><span className="pill">{summary?.subscription?.status ?? 'No plan'}</span><h2>{summary?.plan ? `${money(summary.plan.monthlyPrice)} / month` : 'No active plan'}</h2><p className="muted">{summary?.plan?.name ?? 'Subscription plan will appear after seeding or checkout.'}</p></article>
        <article className="panel"><h2>Provider</h2><p className="muted">{summary?.subscription?.provider ?? 'Not connected'}</p><p className="muted">Renews at {summary?.subscription?.renewsAt ? new Date(summary.subscription.renewsAt).toLocaleDateString() : 'not scheduled'}</p></article>
      </section>
    </PageShell>
  );
}
