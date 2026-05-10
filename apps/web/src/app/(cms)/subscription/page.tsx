'use client';

import { useEffect, useState } from 'react';

import { PageShell } from '../../../components/page-shell';
import {
  createBillingCheckoutSession,
  createBillingCustomerPortal,
  getCmsBillingSummary,
  type CmsBillingSummary,
  type CmsSubscriptionPlan,
} from '../../../lib/api-client';
import { readCmsSettings } from '../../../lib/cms-storage';

const money = (value: number): string =>
  new Intl.NumberFormat('en-IN', { currency: 'INR', style: 'currency' }).format(value);

const formatLimit = (value?: number, label = ''): string => {
  if (!value) return `Unlimited${label ? ` ${label}` : ''}`;
  return `${new Intl.NumberFormat('en-IN').format(value)}${label ? ` ${label}` : ''}`;
};

export default function SubscriptionPage() {
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<CmsBillingSummary | null>(null);
  const [message, setMessage] = useState('Sign in to load subscription data from the database.');
  const [tenantId, setTenantId] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    const settings = readCmsSettings();
    setTenantId(settings.tenantId);
    setToken(settings.token);
    if (!settings.tenantId || !settings.token) return;
    void getCmsBillingSummary(settings.tenantId, settings.token)
      .then((nextSummary) => {
        setSummary(nextSummary);
        setMessage('');
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Could not load subscription.'));
  }, []);

  async function openCheckout(plan: CmsSubscriptionPlan): Promise<void> {
    if (!tenantId || !token) return;
    setBusy(true);
    try {
      const session = await createBillingCheckoutSession(tenantId, plan.code, token);
      window.location.assign(session.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not start Stripe checkout.');
      setBusy(false);
    }
  }

  async function openCustomerPortal(): Promise<void> {
    if (!tenantId || !token) return;
    setBusy(true);
    try {
      const session = await createBillingCustomerPortal(tenantId, token);
      window.location.assign(session.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not open Stripe customer portal.');
      setBusy(false);
    }
  }

  const currentStatus = summary?.subscription?.status ?? 'No plan';
  const plans = summary?.plans ?? [];
  const paymentRequired = Boolean(summary?.paymentRequired);

  return (
    <PageShell
      eyebrow="Subscription"
      title="Choose the right Servora plan"
      description="Restore workspace access, upgrade when the restaurant grows, and manage payment details through Stripe."
    >
      {paymentRequired ? (
        <section className="subscription-alert panel">
          <div>
            <p className="eyebrow">Billing needs attention</p>
            <h2>Your workspace is paused until billing is active.</h2>
            <p className="muted">Choose an available plan below or update the payment method for the current Stripe subscription.</p>
          </div>
          <button disabled={busy || !summary?.subscription} onClick={() => void openCustomerPortal()} type="button">Update payment method</button>
        </section>
      ) : null}
      {message ? <p className="notice-text">{message}</p> : null}
      <section className="cms-settings-grid">
        <article className="panel">
          <span className="pill">{currentStatus}</span>
          <h2>{summary?.plan ? `${money(summary.plan.monthlyPrice)} / month` : 'No active plan'}</h2>
          <p className="muted">{summary?.plan?.name ?? 'Choose a Stripe plan to activate this tenant.'}</p>
          <div className="action-row">
            <button disabled={busy || !summary?.subscription} onClick={() => void openCustomerPortal()} type="button">Update payment method</button>
          </div>
        </article>
        <article className="panel">
          <h2>Provider</h2>
          <p className="muted">{summary?.subscription?.provider ?? 'Stripe checkout not completed'}</p>
          <p className="muted">Renews at {summary?.subscription?.renewsAt ? new Date(summary.subscription.renewsAt).toLocaleDateString() : 'not scheduled'}</p>
        </article>
      </section>
      <section className="subscription-plan-grid subscription-plan-grid--owner">
        {plans.map((plan) => (
          <article className={`subscription-plan-card panel${plan.badge?.toLowerCase() === 'popular' ? ' subscription-plan-card--featured' : ''}`} key={plan.code}>
            <div className="subscription-plan-card__head">
              <span className="pill">{plan.badge || plan.code}</span>
              <h2>{plan.name}</h2>
              <p className="muted">{plan.description ?? 'Stripe-managed subscription for this workspace.'}</p>
            </div>
            <div className="subscription-plan-card__price">
              <strong>{money(plan.monthlyPrice)}</strong>
              <span>/ {plan.interval ?? 'month'}</span>
            </div>
            <div className="subscription-plan-card__limits">
              <span>{formatLimit(plan.employeeLimit, 'employees')}</span>
              <span>{formatLimit(plan.branchLimit, 'branches')}</span>
              <span>{formatLimit(plan.tableLimit, 'tables')}</span>
              <span>{formatLimit(plan.monthlyBillLimit, 'bills / month')}</span>
            </div>
            <ul className="subscription-perk-list">
              {(plan.perks?.length ? plan.perks : ['Stripe checkout and customer portal', 'Secure billing recovery']).map((perk) => (
                <li key={perk}><span aria-hidden="true" className="material-symbols-outlined">check_circle</span>{perk}</li>
              ))}
            </ul>
            <button disabled={busy || !plan.active} onClick={() => void openCheckout(plan)} type="button">
              {summary?.subscription?.planCode === plan.code ? 'Keep or change in Stripe' : 'Subscribe with Stripe'}
            </button>
          </article>
        ))}
      </section>
      {!plans.length ? <p className="notice-text">No subscription plans are currently available. Contact platform support.</p> : null}
    </PageShell>
  );
}
