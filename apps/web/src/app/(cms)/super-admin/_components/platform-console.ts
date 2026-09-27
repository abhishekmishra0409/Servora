'use client';

import { DEFAULT_TENANT_FEATURES } from '@restaurent/shared';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  createSuperAdminTenant,
  documentId,
  getSuperAdminPlans,
  getSuperAdminTenants,
  updateSuperAdminPlanSettings,
  type CmsSubscriptionPlan,
  type CmsSuperAdminTenantSummary,
} from '@/lib/api-client';
import { errorMessage } from '@/lib/async-state';
import { readCmsContext, useCmsResource } from '@/lib/use-cms-resource';
import { humanize, type StatusTone } from '@/lib/status-tone';

export const blankTenantForm = {
  defaultCurrency: 'INR',
  defaultTimezone: 'Asia/Kolkata',
  legalName: '',
  ownerEmail: '',
  ownerName: '',
  ownerPassword: '',
  slug: '',
  status: 'suspended',
};

export type TenantForm = typeof blankTenantForm;

export interface PlatformStats {
  activePlans: number;
  activeSubscriptions: number;
  activeTenants: number;
  attention: number;
  monthlyValue: number;
  totalTenants: number;
}

export interface PlatformEvent {
  kind: 'tenant' | 'billing';
  label: string;
  tone: StatusTone;
  value: string;
}

export const platformMoney = (value: number, currency = 'INR'): string =>
  new Intl.NumberFormat('en-IN', { currency, maximumFractionDigits: 0, style: 'currency' }).format(value);

export const planMoney = (plan: CmsSubscriptionPlan): string => platformMoney(plan.monthlyPrice, plan.currency ?? 'INR');

/**
 * State shared by every platform console view: tenants, plans, derived stats,
 * and the create/save actions. Each route mounts its own instance.
 */
export function usePlatformConsole() {
  const [busy, setBusy] = useState(false);
  const [createForm, setCreateForm] = useState<TenantForm>(blankTenantForm);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const resource = useCmsResource<{ plans: CmsSubscriptionPlan[]; tenants: CmsSuperAdminTenantSummary[] }>(
    async ({ token }) => {
      const [tenants, plans] = await Promise.all([getSuperAdminTenants(token), getSuperAdminPlans(token)]);
      setSelectedTenantId((current) => current || documentId(tenants[0]?.tenant ?? {}));
      return { plans, tenants };
    },
    { initial: { plans: [], tenants: [] }, scope: 'account' },
  );
  const { plans, tenants } = resource.data;
  const token = readCmsContext().token;

  const stats = useMemo<PlatformStats>(() => {
    const activeTenants = tenants.filter((item) => item.tenant.status === 'active').length;
    const activeSubscriptions = tenants.filter((item) => item.subscription?.status === 'active').length;
    const attention = tenants.filter((item) =>
      ['past_due', 'suspended', 'cancelled'].includes(item.subscription?.status ?? item.tenant.status),
    ).length;
    const monthlyValue = tenants.reduce((total, item) => {
      if (!['trialing', 'active', 'grace_period'].includes(item.subscription?.status ?? '')) return total;
      return total + (item.plan?.monthlyPrice ?? 0);
    }, 0);

    return {
      activePlans: plans.filter((plan) => plan.active).length,
      activeSubscriptions,
      activeTenants,
      attention,
      monthlyValue,
      totalTenants: tenants.length,
    };
  }, [plans, tenants]);

  const recentEvents = useMemo<PlatformEvent[]>(() => {
    const tenantEvents = tenants.slice(0, 3).map<PlatformEvent>((item) => ({
      kind: 'tenant',
      label: item.tenant.status === 'active' ? 'Tenant active' : `Tenant ${humanize(item.tenant.status).toLowerCase()}`,
      tone: item.tenant.status === 'active' ? 'success' : 'warning',
      value: item.tenant.legalName,
    }));
    const billingEvents = tenants
      .filter((item) => item.subscription)
      .slice(0, 2)
      .map<PlatformEvent>((item) => ({
        kind: 'billing',
        label: `Subscription ${humanize(item.subscription?.status ?? '').toLowerCase()}`,
        tone: item.subscription?.status === 'active' ? 'success' : 'warning',
        value: `${item.tenant.legalName} · ${item.plan?.name ?? item.subscription?.planCode ?? ''}`,
      }));

    return [...tenantEvents, ...billingEvents].slice(0, 5);
  }, [tenants]);

  async function createTenant(): Promise<boolean> {
    if (!createForm.legalName.trim()) {
      toast.error('Tenant name is required.');
      return false;
    }
    if (!createForm.ownerEmail.trim() || createForm.ownerPassword.length < 8) {
      toast.error('Owner email and an 8+ character owner password are required.');
      return false;
    }

    setBusy(true);
    try {
      const body: {
        defaultCurrency: string;
        defaultTimezone: string;
        enabledFeatures: string[];
        legalName: string;
        ownerEmail: string;
        ownerName?: string;
        ownerPassword: string;
        slug?: string;
        status: string;
      } = {
        defaultCurrency: createForm.defaultCurrency.trim(),
        defaultTimezone: createForm.defaultTimezone.trim(),
        enabledFeatures: DEFAULT_TENANT_FEATURES,
        legalName: createForm.legalName.trim(),
        ownerEmail: createForm.ownerEmail.trim(),
        ownerPassword: createForm.ownerPassword,
        status: createForm.status,
      };
      const slug = createForm.slug.trim();
      if (slug) body.slug = slug;
      const ownerName = createForm.ownerName.trim();
      if (ownerName) body.ownerName = ownerName;

      const nextDetail = await createSuperAdminTenant(body, token);
      setCreateForm(blankTenantForm);
      setSelectedTenantId(documentId(nextDetail.tenant));
      toast.success(`${nextDetail.tenant.legalName} created`);
      await resource.reload();
      return true;
    } catch (error) {
      toast.error(errorMessage(error, 'Could not create tenant.'));
      return false;
    } finally {
      setBusy(false);
    }
  }

  function updatePlanLocal(code: string, patch: Partial<CmsSubscriptionPlan>): void {
    resource.setData((current) => ({
      ...current,
      plans: current.plans.map((plan) => (plan.code === code ? { ...plan, ...patch } : plan)),
    }));
  }

  async function savePlanSettings(plan: CmsSubscriptionPlan): Promise<void> {
    setBusy(true);
    try {
      const nextPlan = await updateSuperAdminPlanSettings(
        plan.code,
        {
          badge: plan.badge ?? '',
          branchLimit: Number(plan.branchLimit ?? 0),
          customRoleLimit: Number(plan.customRoleLimit ?? 0),
          description: plan.description ?? '',
          employeeLimit: Number(plan.employeeLimit ?? 0),
          features: plan.features ?? [],
          menuItemLimit: Number(plan.menuItemLimit ?? 0),
          monthlyBillLimit: Number(plan.monthlyBillLimit ?? 0),
          perks: plan.perks ?? [],
          sortOrder: Number(plan.sortOrder ?? 0),
          tableLimit: Number(plan.tableLimit ?? 0),
          visible: Boolean(plan.visible),
        },
        token,
      );
      updatePlanLocal(plan.code, nextPlan);
      toast.success(`${nextPlan.name} settings saved`);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not save plan settings.'));
    } finally {
      setBusy(false);
    }
  }

  return {
    busy: busy || resource.refreshing,
    createForm,
    createTenant,
    load: resource.reload,
    plans,
    recentEvents,
    savePlanSettings,
    selectTenant: setSelectedTenantId,
    selectedTenantId,
    setCreateForm,
    state: resource,
    stats,
    tenants,
    token,
    updatePlanLocal,
  };
}

export type PlatformConsole = ReturnType<typeof usePlatformConsole>;
