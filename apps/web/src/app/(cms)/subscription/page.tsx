'use client';

import { CircleCheck, CreditCard } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useCmsSession } from '@/components/cms-session-provider';
import { EmptyState } from '@/components/empty-state';
import { LoadingCards } from '@/components/loading-state';
import { PageShell } from '@/components/page-shell';
import { UsageMeter } from '@/components/plan-limit-notice';
import { SectionCard } from '@/components/section-card';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  createBillingCheckoutSession,
  createBillingCustomerPortal,
  getCmsBillingSummary,
  type CmsBillingSummary,
  type CmsSubscriptionPlan,
} from '@/lib/api-client';
import { errorMessage } from '@/lib/async-state';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';
import { readCmsContext, useCmsResource } from '@/lib/use-cms-resource';

const USAGE_ROWS: [string, string][] = [
  ['employees', 'Staff accounts'],
  ['branches', 'Outlets'],
  ['tables', 'Tables'],
  ['monthlyBills', 'Bills this month'],
  ['menuItems', 'Menu items'],
  ['customRoles', 'Custom roles'],
];

const formatLimit = (value?: number, label = ''): string => {
  if (!value) return `Unlimited${label ? ` ${label}` : ''}`;
  return `${new Intl.NumberFormat('en-IN').format(value)}${label ? ` ${label}` : ''}`;
};

export default function SubscriptionPage() {
  const { entitlements } = useCmsSession();
  const [busy, setBusy] = useState(false);
  const resource = useCmsResource<CmsBillingSummary | null>(({ tenantId, token }) => getCmsBillingSummary(tenantId, token), {
    initial: null,
    scope: 'tenant',
  });
  const summary = resource.data;

  async function openCheckout(plan: CmsSubscriptionPlan): Promise<void> {
    const { tenantId, token } = readCmsContext();
    if (!tenantId || !token) return;
    setBusy(true);
    try {
      const session = await createBillingCheckoutSession(tenantId, plan.code, token);
      window.location.assign(session.url);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not start Stripe checkout.'));
      setBusy(false);
    }
  }

  async function openCustomerPortal(): Promise<void> {
    const { tenantId, token } = readCmsContext();
    if (!tenantId || !token) return;
    setBusy(true);
    try {
      const session = await createBillingCustomerPortal(tenantId, token);
      window.location.assign(session.url);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not open the Stripe customer portal.'));
      setBusy(false);
    }
  }

  const plans = summary?.plans ?? [];
  const paymentRequired = Boolean(summary?.paymentRequired);
  const status = summary?.subscription?.status;

  return (
    <PageShell
      resource={resource}
      what="your subscription"
      description="Restore workspace access, upgrade when the restaurant grows, and manage payment details through Stripe."
      eyebrow="Subscription"
      title="Plan and billing"
    >
      {paymentRequired ? (
        <Card className="border-warning/40 bg-warning-foreground shadow-card">
          <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-warning">Billing needs attention</p>
              <p className="font-display text-xl font-semibold">Your workspace is paused until billing is active.</p>
              <p className="text-sm text-muted-foreground">
                Choose a plan below or update the payment method for the current Stripe subscription.
              </p>
            </div>
            <Button disabled={busy || !summary?.subscription} onClick={() => void openCustomerPortal()} type="button">
              <CreditCard />
              Update payment method
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {entitlements ? (
        <SectionCard
          actions={<Badge>{entitlements.planName}</Badge>}
          description="Existing records always keep working. When a limit is reached, only new ones are blocked."
          title="Your usage"
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {USAGE_ROWS.map(([key, label]) => (
              <UsageMeter cap={entitlements.limits[key] ?? 0} key={key} label={label} used={entitlements.usage[key] ?? 0} />
            ))}
          </div>
        </SectionCard>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          actions={status ? <StatusBadge kind="subscription" value={status} /> : <Badge variant="secondary">No plan</Badge>}
          title="Current plan"
        >
          <p className="font-display text-2xl font-semibold">
            {summary?.plan ? `${money(summary.plan.monthlyPrice)} / month` : 'No active plan'}
          </p>
          <p className="text-sm text-muted-foreground">{summary?.plan?.name ?? 'Choose a plan to activate this restaurant.'}</p>
          <Button disabled={busy || !summary?.subscription} onClick={() => void openCustomerPortal()} type="button" variant="outline">
            <CreditCard />
            Update payment method
          </Button>
        </SectionCard>
        <SectionCard title="Billing provider">
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Provider</dt>
              <dd className="font-medium capitalize">{summary?.subscription?.provider ?? 'Checkout not completed'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Renews</dt>
              <dd className="font-medium">
                {summary?.subscription?.renewsAt ? new Date(summary.subscription.renewsAt).toLocaleDateString() : 'Not scheduled'}
              </dd>
            </div>
          </dl>
        </SectionCard>
      </section>

      {resource.status === 'loading' ? (
        <LoadingCards count={3} variant="plan" />
      ) : plans.length === 0 ? (
        <EmptyState description="Contact platform support to enable plans for this restaurant." icon={CreditCard} title="No plans available" />
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => {
            const featured = plan.badge?.toLowerCase() === 'popular';
            const current = summary?.subscription?.planCode === plan.code;
            return (
              <Card className={cn('flex flex-col shadow-card', featured && 'border-primary ring-2 ring-primary/20')} key={plan.code}>
                <CardContent className="flex flex-1 flex-col gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={featured ? 'default' : 'secondary'}>{plan.badge || plan.code}</Badge>
                      {current ? <Badge variant="success">Current</Badge> : null}
                    </div>
                    <h2 className="font-display text-xl font-semibold">{plan.name}</h2>
                    <p className="text-sm text-muted-foreground">{plan.description ?? 'Stripe-managed subscription for this workspace.'}</p>
                  </div>
                  <p className="flex items-baseline gap-1">
                    <span className="font-display text-3xl font-semibold tabular-nums">{money(plan.monthlyPrice)}</span>
                    <span className="text-sm text-muted-foreground">/ {plan.interval ?? 'month'}</span>
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      formatLimit(plan.employeeLimit, 'staff'),
                      formatLimit(plan.branchLimit, 'outlets'),
                      formatLimit(plan.tableLimit, 'tables'),
                      formatLimit(plan.monthlyBillLimit, 'bills / month'),
                    ].map((limit) => (
                      <span className="rounded-md bg-secondary px-2.5 py-2 font-medium text-secondary-foreground" key={limit}>
                        {limit}
                      </span>
                    ))}
                  </div>
                  <ul className="grid gap-2 text-sm">
                    {(plan.perks?.length ? plan.perks : ['Stripe checkout and customer portal', 'Secure billing recovery']).map((perk) => (
                      <li className="flex items-start gap-2" key={perk}>
                        <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="mt-auto" disabled={busy || !plan.active} onClick={() => void openCheckout(plan)} type="button" variant={featured ? 'default' : 'outline'}>
                    {current ? 'Keep or change in Stripe' : 'Subscribe with Stripe'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}
    </PageShell>
  );
}
