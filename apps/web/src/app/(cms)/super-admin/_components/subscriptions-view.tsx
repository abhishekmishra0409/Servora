'use client';

import { PLAN_FEATURES } from '@restaurent/shared';
import { CreditCard, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';

import { EmptyState } from '@/components/empty-state';
import { FormActions, FormField, FormGrid } from '@/components/form-field';
import { LoadingCards } from '@/components/loading-state';
import { SectionCard } from '@/components/section-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { CmsSubscriptionPlan } from '@/lib/api-client';

import { planMoney, usePlatformConsole, type PlatformConsole } from './platform-console';
import { PlatformPage } from './platform-page';
import { SubscriptionTable } from './subscription-table';

const limitFields: { key: keyof CmsSubscriptionPlan; label: string }[] = [
  { key: 'employeeLimit', label: 'Employee limit' },
  { key: 'branchLimit', label: 'Outlet limit' },
  { key: 'tableLimit', label: 'Table limit' },
  { key: 'monthlyBillLimit', label: 'Monthly bill limit' },
  { key: 'menuItemLimit', label: 'Menu item limit' },
  { key: 'customRoleLimit', label: 'Custom role limit' },
];

function PlanEditor({ console, plan }: { console: PlatformConsole; plan: CmsSubscriptionPlan }): ReactNode {
  const { busy, savePlanSettings, token, updatePlanLocal } = console;
  const id = `plan-${plan.code}`;

  return (
    <SectionCard
      actions={
        <label className="flex items-center gap-2 text-sm font-medium">
          <Switch checked={plan.visible !== false} onCheckedChange={(checked) => updatePlanLocal(plan.code, { visible: checked })} />
          Show to owners
        </label>
      }
      description={`${planMoney(plan)} / ${plan.interval ?? 'month'} · Stripe managed`}
      title={plan.name}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={plan.active ? 'success' : 'warning'}>{plan.active ? 'Active in Stripe' : 'Not active in Stripe'}</Badge>
        <Badge variant="outline">{plan.badge || plan.code}</Badge>
        <span className="text-xs text-muted-foreground">{plan.stripeProductId ?? plan.stripePriceId ?? 'Stripe plan not configured'}</span>
      </div>

      <FormGrid>
        <FormField htmlFor={`${id}-badge`} label="Badge">
          <Input id={`${id}-badge`} onChange={(event) => updatePlanLocal(plan.code, { badge: event.target.value })} value={plan.badge ?? ''} />
        </FormField>
        <FormField htmlFor={`${id}-sort`} label="Sort order">
          <Input id={`${id}-sort`} min="0" onChange={(event) => updatePlanLocal(plan.code, { sortOrder: Number(event.target.value) })} type="number" value={plan.sortOrder ?? 0} />
        </FormField>
      </FormGrid>
      <FormField htmlFor={`${id}-description`} label="Description">
        <Textarea id={`${id}-description`} onChange={(event) => updatePlanLocal(plan.code, { description: event.target.value })} rows={2} value={plan.description ?? ''} />
      </FormField>

      <FormGrid columns={3}>
        {limitFields.map((field) => (
          <FormField htmlFor={`${id}-${field.key}`} key={field.key} label={field.label}>
            <Input
              id={`${id}-${field.key}`}
              min="0"
              onChange={(event) => updatePlanLocal(plan.code, { [field.key]: Number(event.target.value) })}
              type="number"
              value={Number(plan[field.key] ?? 0)}
            />
          </FormField>
        ))}
      </FormGrid>
      <p className="text-xs text-muted-foreground">0 means unlimited. Capabilities below gate whole features regardless of the counts.</p>

      <div className="grid gap-2 sm:grid-cols-2">
        {PLAN_FEATURES.map((feature) => (
          <label className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm" key={feature.key}>
            <Checkbox
              checked={(plan.features ?? []).includes(feature.key)}
              onCheckedChange={(checked) =>
                updatePlanLocal(plan.code, {
                  features: checked === true ? [...(plan.features ?? []), feature.key] : (plan.features ?? []).filter((item) => item !== feature.key),
                })
              }
            />
            {feature.label}
          </label>
        ))}
      </div>

      <FormField hint="One perk per line." htmlFor={`${id}-perks`} label="Owner-facing perks">
        <Textarea
          id={`${id}-perks`}
          onChange={(event) => updatePlanLocal(plan.code, { perks: event.target.value.split('\n').map((item) => item.trim()).filter(Boolean) })}
          rows={3}
          value={(plan.perks ?? []).join('\n')}
        />
      </FormField>

      <FormActions>
        <Button disabled={busy || !token} onClick={() => void savePlanSettings(plan)} type="button">
          Save display settings
        </Button>
      </FormActions>
    </SectionCard>
  );
}

export function SubscriptionsView(): ReactNode {
  const console = usePlatformConsole();
  const { busy, plans, state, tenants, token } = console;

  return (
    <PlatformPage
      actions={
        <Button disabled={busy || !token} onClick={() => void console.load()} type="button" variant="outline">
          <RefreshCw />
          Sync Stripe status
        </Button>
      }
      description="Stripe is the billing source of truth. Prices, product status, cancellations, and failed payments come from Checkout, the Customer Portal, and webhooks. Limits and display settings are managed here."
      state={state}
      title="Subscription plans"
    >
      {state.status === 'loading' ? (
        <LoadingCards count={2} />
      ) : plans.length === 0 ? (
        <EmptyState description="Configure plans in Stripe and they will appear here." icon={CreditCard} title="No plans found" />
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          {plans.map((plan) => (
            <PlanEditor console={console} key={plan.code} plan={plan} />
          ))}
        </section>
      )}

      <SubscriptionTable loading={state.status === 'loading'} tenants={tenants} />
    </PlatformPage>
  );
}
