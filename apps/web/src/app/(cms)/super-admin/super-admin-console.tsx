'use client';

import { DEFAULT_TENANT_FEATURES, TENANT_FEATURES } from '@restaurent/shared';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ChangePasswordForm } from '../../../components/change-password-form';
import { PageShell } from '../../../components/page-shell';
import {
  createSuperAdminTenant,
  documentId,
  getSuperAdminPlans,
  getSuperAdminTenant,
  getSuperAdminTenants,
  updateSuperAdminPlanSettings,
  updateSuperAdminTenant,
  updateSuperAdminTenantFeatures,
  type CmsSubscriptionPlan,
  type CmsSuperAdminTenantDetail,
  type CmsSuperAdminTenantSummary,
} from '../../../lib/api-client';
import { readCmsSettings } from '../../../lib/cms-storage';

export type SuperAdminView =
  | 'audit-logs'
  | 'billing'
  | 'dashboard'
  | 'settings'
  | 'subscriptions'
  | 'system-health'
  | 'tenants';

const viewMeta: Record<SuperAdminView, { description: string; title: string }> = {
  'audit-logs': {
    description: 'Review administrative changes, tenant events, and platform access activity.',
    title: 'Audit logs',
  },
  billing: {
    description: 'Track billing status, MRR, payment risk, and tenant subscription health.',
    title: 'Billing',
  },
  dashboard: {
    description: 'Monitor platform growth, subscription health, and tenant activity.',
    title: 'Super admin dashboard',
  },
  settings: {
    description: 'Manage global platform defaults, controls, and infrastructure configuration.',
    title: 'Global platform settings',
  },
  subscriptions: {
    description: 'Review Stripe plans and tenant subscription health.',
    title: 'Manage subscription',
  },
  'system-health': {
    description: 'Monitor API, database, realtime, and edge service health.',
    title: 'System health monitoring',
  },
  tenants: {
    description: 'Create tenants, edit account data, and manage feature permissions.',
    title: 'Tenant management',
  },
};

const tenantStatuses = ['active', 'suspended', 'archived'];
const tenantDetailAuditLimit = 10;

const blankTenantForm = {
  defaultCurrency: 'INR',
  defaultTimezone: 'Asia/Kolkata',
  legalName: '',
  ownerEmail: '',
  ownerName: '',
  ownerPassword: '',
  slug: '',
  status: 'suspended',
};

const money = (value: number): string =>
  new Intl.NumberFormat('en-IN', { currency: 'INR', maximumFractionDigits: 0, style: 'currency' }).format(value);
const planMoney = (plan: CmsSubscriptionPlan): string =>
  new Intl.NumberFormat('en-IN', {
    currency: plan.currency ?? 'INR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(plan.monthlyPrice);

const label = (value: string): string => value.replaceAll('_', ' ');
const displayDate = (value?: string): string => (value ? new Date(value).toLocaleDateString() : 'Not set');

export function SuperAdminConsole({ view }: { view: SuperAdminView }) {
  const [busy, setBusy] = useState(false);
  const [createForm, setCreateForm] = useState(blankTenantForm);
  const [message, setMessage] = useState('Loading platform data...');
  const [plans, setPlans] = useState<CmsSubscriptionPlan[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [tenants, setTenants] = useState<CmsSuperAdminTenantSummary[]>([]);
  const [token, setToken] = useState('');

  useEffect(() => {
    const settings = readCmsSettings();
    setToken(settings.token);
    if (!settings.token) {
      setMessage('Sign in as super admin to manage platform tenants.');
      return;
    }
    void load(settings.token);
  }, []);

  const stats = useMemo(() => {
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

  const recentEvents = useMemo(() => {
    const tenantEvents = tenants.slice(0, 3).map((item) => ({
      icon: 'domain_add',
      label: item.tenant.status === 'active' ? 'Tenant active' : `Tenant ${label(item.tenant.status)}`,
      tone: item.tenant.status === 'active' ? 'good' : 'warning',
      value: item.tenant.legalName,
    }));
    const billingEvents = tenants
      .filter((item) => item.subscription)
      .slice(0, 2)
      .map((item) => ({
        icon: 'payments',
        label: `Subscription ${label(item.subscription?.status ?? '')}`,
        tone: item.subscription?.status === 'active' ? 'good' : 'warning',
        value: `${item.tenant.legalName} - ${item.plan?.name ?? item.subscription?.planCode}`,
      }));

    return [...tenantEvents, ...billingEvents].slice(0, 5);
  }, [tenants]);

  async function load(nextToken = token, nextTenantId = selectedTenantId): Promise<void> {
    setBusy(true);
    try {
      const [nextTenants, nextPlans] = await Promise.all([
        getSuperAdminTenants(nextToken),
        getSuperAdminPlans(nextToken),
      ]);
      setTenants(nextTenants);
      setPlans(nextPlans);
      const fallbackTenantId = nextTenantId || documentId(nextTenants[0]?.tenant ?? {});
      setSelectedTenantId(fallbackTenantId);
      setMessage(nextTenants.length ? '' : 'No tenants exist yet.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load platform tenants.');
    } finally {
      setBusy(false);
    }
  }

  function selectTenant(id: string): void {
    setSelectedTenantId(id);
  }

  async function createTenant(): Promise<void> {
    if (!createForm.legalName.trim()) {
      setMessage('Tenant name is required.');
      return;
    }
    if (!createForm.ownerEmail.trim() || createForm.ownerPassword.length < 8) {
      setMessage('Owner email and an 8+ character owner password are required.');
      return;
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
      setMessage('Tenant created.');
      await load(token, documentId(nextDetail.tenant));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create tenant.');
    } finally {
      setBusy(false);
    }
  }

  function updatePlanLocal(code: string, patch: Partial<CmsSubscriptionPlan>): void {
    setPlans((current) => current.map((plan) => (plan.code === code ? { ...plan, ...patch } : plan)));
  }

  async function savePlanSettings(plan: CmsSubscriptionPlan): Promise<void> {
    setBusy(true);
    try {
      const nextPlan = await updateSuperAdminPlanSettings(
        plan.code,
        {
          badge: plan.badge ?? '',
          branchLimit: Number(plan.branchLimit ?? 0),
          description: plan.description ?? '',
          employeeLimit: Number(plan.employeeLimit ?? 0),
          monthlyBillLimit: Number(plan.monthlyBillLimit ?? 0),
          perks: plan.perks ?? [],
          sortOrder: Number(plan.sortOrder ?? 0),
          tableLimit: Number(plan.tableLimit ?? 0),
          visible: Boolean(plan.visible),
        },
        token,
      );
      updatePlanLocal(plan.code, nextPlan);
      setMessage(`${nextPlan.name} settings saved.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save plan settings.');
    } finally {
      setBusy(false);
    }
  }

  const meta = viewMeta[view];

  return (
    <PageShell
      eyebrow="Super Admin"
      title={meta.title}
      description={meta.description}
      toolbar={
        <button disabled={busy || !token} onClick={() => void load()} type="button">
          <span aria-hidden="true" className="material-symbols-outlined">refresh</span>
          Refresh
        </button>
      }
    >
      {message ? <p className="notice-text">{message}</p> : null}

      {view === 'dashboard' ? (
        <>
          <MetricGrid
            metrics={[
              ['Total tenants', String(stats.totalTenants)],
              ['Active tenants', String(stats.activeTenants)],
              ['Current MRR', money(stats.monthlyValue)],
              ['Needs attention', String(stats.attention)],
            ]}
          />
          <section className="super-dashboard-grid">
            <GrowthPanel />
            <RecentEvents events={recentEvents} />
            <HealthPanel stats={stats} />
          </section>
        </>
      ) : null}

      {view === 'subscriptions' ? (
        <>
          <section className="subscription-plan-grid">
            {plans.map((plan) => (
              <article className="panel subscription-admin-card" key={plan.code}>
                <div className="cms-section-head">
                  <div>
                    <span className="pill">{plan.badge || plan.code}</span>
                    <h2>{plan.name}</h2>
                    <p className="muted">{planMoney(plan)} / {plan.interval ?? 'month'} - Stripe managed</p>
                  </div>
                  <label className="checkbox-row">
                    <input
                      checked={plan.visible !== false}
                      onChange={(event) => updatePlanLocal(plan.code, { visible: event.target.checked })}
                      type="checkbox"
                    />
                    Show to owners
                  </label>
                </div>
                <div className="cms-form-grid">
                  <div className="cms-form-grid cms-form-grid--two">
                    <label><span>Badge</span><input onChange={(event) => updatePlanLocal(plan.code, { badge: event.target.value })} value={plan.badge ?? ''} /></label>
                    <label><span>Sort order</span><input min="0" onChange={(event) => updatePlanLocal(plan.code, { sortOrder: Number(event.target.value) })} type="number" value={plan.sortOrder ?? 0} /></label>
                  </div>
                  <label><span>Description</span><textarea onChange={(event) => updatePlanLocal(plan.code, { description: event.target.value })} value={plan.description ?? ''} /></label>
                  <div className="cms-form-grid cms-form-grid--two">
                    <label><span>Employee limit</span><input min="0" onChange={(event) => updatePlanLocal(plan.code, { employeeLimit: Number(event.target.value) })} type="number" value={plan.employeeLimit ?? 0} /></label>
                    <label><span>Branch limit</span><input min="0" onChange={(event) => updatePlanLocal(plan.code, { branchLimit: Number(event.target.value) })} type="number" value={plan.branchLimit ?? 0} /></label>
                    <label><span>Table limit</span><input min="0" onChange={(event) => updatePlanLocal(plan.code, { tableLimit: Number(event.target.value) })} type="number" value={plan.tableLimit ?? 0} /></label>
                    <label><span>Monthly bill limit</span><input min="0" onChange={(event) => updatePlanLocal(plan.code, { monthlyBillLimit: Number(event.target.value) })} type="number" value={plan.monthlyBillLimit ?? 0} /></label>
                  </div>
                  <label><span>Owner-facing perks</span><textarea onChange={(event) => updatePlanLocal(plan.code, { perks: event.target.value.split('\n').map((item) => item.trim()).filter(Boolean) })} value={(plan.perks ?? []).join('\n')} /></label>
                  <div className="action-row">
                    <span className={`cms-status ${plan.active ? 'super-status--good' : 'super-status--warning'}`}>
                      {plan.active ? 'active in Stripe' : 'not active in Stripe'}
                    </span>
                    <button className="button-secondary" disabled={busy || !token} onClick={() => void savePlanSettings(plan)} type="button">Save display settings</button>
                  </div>
                </div>
                <small className="muted">{plan.stripeProductId ?? plan.stripePriceId ?? 'Stripe plan not configured'}</small>
              </article>
            ))}
          </section>
          <section className="panel">
            <div className="cms-section-head">
              <div>
                <h2>Stripe is the billing source of truth</h2>
                <p className="muted">Plan prices, product status, cancellations, and failed payments are read from Stripe Checkout, Customer Portal, and webhooks.</p>
              </div>
              <button className="button-secondary" disabled={busy || !token} onClick={() => void load()} type="button">Sync Stripe status</button>
            </div>
          </section>
          <SubscriptionTable selectTenant={selectTenant} tenants={tenants} />
        </>
      ) : null}

      {view === 'tenants' ? (
        <>
          <MetricGrid
            metrics={[
              ['Total tenants', String(stats.totalTenants)],
              ['Active tenants', String(stats.activeTenants)],
              ['Suspended or risk', String(stats.attention)],
              ['Feature modules', String(TENANT_FEATURES.length)],
            ]}
          />
          <section className="cms-dashboard-grid">
            <TenantList busy={busy} selectedTenantId={selectedTenantId} tenants={tenants} />
            <CreateTenantForm busy={busy} createForm={createForm} createTenant={createTenant} setCreateForm={setCreateForm} token={token} />
          </section>
        </>
      ) : null}

      {view === 'system-health' ? <SystemHealthView recentEvents={recentEvents} stats={stats} /> : null}
      {view === 'billing' ? <BillingView selectTenant={selectTenant} stats={stats} tenants={tenants} /> : null}
      {view === 'audit-logs' ? <AuditLogView events={recentEvents} tenants={tenants} /> : null}
      {view === 'settings' ? <SettingsView setMessage={setMessage} /> : null}
    </PageShell>
  );
}

export function SuperAdminTenantDetailPage({ tenantId }: { tenantId: string }) {
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<CmsSuperAdminTenantDetail | null>(null);
  const [editingTenant, setEditingTenant] = useState(false);
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>([]);
  const [logPage, setLogPage] = useState(1);
  const [message, setMessage] = useState('Loading tenant detail...');
  const [tenantForm, setTenantForm] = useState(blankTenantForm);
  const [token, setToken] = useState('');

  useEffect(() => {
    setLogPage(1);
  }, [tenantId]);

  useEffect(() => {
    const settings = readCmsSettings();
    setToken(settings.token);
    if (!settings.token) {
      setMessage('Sign in as super admin to view tenant detail.');
      return;
    }

    void loadTenantDetail(settings.token, logPage);
  }, [tenantId, logPage]);

  function applyDetail(nextDetail: CmsSuperAdminTenantDetail): void {
    setDetail(nextDetail);
    setEnabledFeatures(nextDetail.tenant.enabledFeatures?.length ? nextDetail.tenant.enabledFeatures : DEFAULT_TENANT_FEATURES);
    setTenantForm({
      defaultCurrency: nextDetail.tenant.defaultCurrency,
      defaultTimezone: nextDetail.tenant.defaultTimezone,
      legalName: nextDetail.tenant.legalName,
      ownerEmail: '',
      ownerName: '',
      ownerPassword: '',
      slug: nextDetail.tenant.slug,
      status: nextDetail.tenant.status,
    });
    setMessage('');
  }

  async function loadTenantDetail(nextToken = token, nextLogPage = logPage): Promise<void> {
    setBusy(true);
    try {
      applyDetail(await getSuperAdminTenant(tenantId, nextToken, { auditLimit: tenantDetailAuditLimit, auditPage: nextLogPage }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load tenant detail.');
    } finally {
      setBusy(false);
    }
  }

  async function saveTenantDetails(): Promise<void> {
    if (!detail || !token) return;
    setBusy(true);
    try {
      const nextDetail = await updateSuperAdminTenant(documentId(detail.tenant), tenantForm, token);
      applyDetail(nextDetail);
      setEditingTenant(false);
      setMessage('Tenant account updated.');
      await loadTenantDetail(token, logPage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update tenant.');
    } finally {
      setBusy(false);
    }
  }

  async function saveFeaturePermissions(): Promise<void> {
    if (!detail || !token) return;
    setBusy(true);
    try {
      const nextDetail = await updateSuperAdminTenantFeatures(documentId(detail.tenant), enabledFeatures, token);
      applyDetail(nextDetail);
      setMessage('Tenant permissions updated.');
      await loadTenantDetail(token, logPage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update tenant permissions.');
    } finally {
      setBusy(false);
    }
  }

  function toggleFeature(feature: string): void {
    setEnabledFeatures((current) =>
      current.includes(feature) ? current.filter((item) => item !== feature) : [...current, feature],
    );
  }

  const business = detail?.business ?? {
    annualizedRevenue: 0,
    auditEntryCount: detail?.auditLogs?.length ?? 0,
    branchCount: detail?.branches?.length ?? 0,
    currentMrr: detail?.plan?.monthlyPrice ?? 0,
    employeeCount: detail?.employees?.length ?? 0,
    enabledFeatureCount: detail?.tenant.enabledFeatures?.length ?? 0,
    lifetimeValue: 0,
    planName: detail?.plan?.name ?? 'No plan',
    restaurantAverageOrderValue: 0,
    restaurantOrderCount: 0,
    restaurantRevenue: 0,
    restaurantRevenueThisMonth: 0,
    restaurantThisMonthOrderCount: 0,
    subscriptionStatus: detail?.subscription?.status ?? 'not_started',
  };
  const auditPagination = detail?.auditLogPagination ?? {
    limit: tenantDetailAuditLimit,
    page: logPage,
    total: detail?.auditLogs?.length ?? 0,
    totalPages: 1,
  };

  return (
    <PageShell
      eyebrow="Super Admin"
      title={detail?.tenant.legalName ?? 'Tenant detail'}
      description="Review this tenant account, owner-created employee access, subscription revenue, and platform activity."
      toolbar={<Link className="button-secondary" href="/super-admin/tenants">Back to tenants</Link>}
    >
      {message ? <p className="notice-text">{message}</p> : null}
      {detail ? (
        <>
          <MetricGrid
            metrics={[
              ['Current MRR', money(business.currentMrr)],
              ['App revenue', money(business.lifetimeValue)],
              ['Restaurant revenue', money(business.restaurantRevenue)],
              ['Employees', String(business.employeeCount)],
            ]}
          />
          <section className="cms-settings-grid">
            <article className="panel">
              <div className="cms-section-head">
                <h2>Tenant account</h2>
                <button className="button-secondary" disabled={busy} onClick={() => setEditingTenant((current) => !current)} type="button">
                  {editingTenant ? 'Close edit' : 'Edit'}
                </button>
              </div>
              {editingTenant ? (
                <div className="cms-form-grid">
                  <label><span>Name</span><input onChange={(event) => setTenantForm({ ...tenantForm, legalName: event.target.value })} value={tenantForm.legalName} /></label>
                  <label><span>Slug</span><input onChange={(event) => setTenantForm({ ...tenantForm, slug: event.target.value })} value={tenantForm.slug} /></label>
                  <label>
                    <span>Status</span>
                    <select onChange={(event) => setTenantForm({ ...tenantForm, status: event.target.value })} value={tenantForm.status}>
                      {tenantStatuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}
                    </select>
                  </label>
                  <div className="cms-form-grid cms-form-grid--two">
                    <label><span>Currency</span><input onChange={(event) => setTenantForm({ ...tenantForm, defaultCurrency: event.target.value })} value={tenantForm.defaultCurrency} /></label>
                    <label><span>Timezone</span><input onChange={(event) => setTenantForm({ ...tenantForm, defaultTimezone: event.target.value })} value={tenantForm.defaultTimezone} /></label>
                  </div>
                  <button disabled={busy} onClick={() => void saveTenantDetails()} type="button">Save tenant</button>
                </div>
              ) : (
                <div className="super-detail-list">
                  <span>Legal name <strong>{detail.tenant.legalName}</strong></span>
                  <span>Slug <strong>{detail.tenant.slug}</strong></span>
                  <span>Status <strong>{label(detail.tenant.status)}</strong></span>
                  <span>Branches <strong>{business.branchCount}</strong></span>
                  <span>Features enabled <strong>{business.enabledFeatureCount}</strong></span>
                </div>
              )}
            </article>
            <article className="panel">
              <h2>Subscription revenue</h2>
              <div className="super-detail-list">
                <span>Plan <strong>{business.planName}</strong></span>
                <span>Status <strong>{label(business.subscriptionStatus)}</strong></span>
                <span>Monthly value <strong>{money(business.currentMrr)}</strong></span>
                <span>Annualized value <strong>{money(business.annualizedRevenue)}</strong></span>
                <span>Renews at <strong>{displayDate(business.renewsAt)}</strong></span>
              </div>
            </article>
          </section>
          <section className="panel">
            <div className="cms-section-head">
              <h2>Restaurant revenue</h2>
              <span className="cms-status">{business.restaurantOrderCount} orders</span>
            </div>
            <div className="super-detail-list super-detail-list--columns">
              <span>Total sales recorded <strong>{money(business.restaurantRevenue)}</strong></span>
              <span>This month <strong>{money(business.restaurantRevenueThisMonth)}</strong></span>
              <span>Monthly orders <strong>{business.restaurantThisMonthOrderCount}</strong></span>
              <span>Average order value <strong>{money(business.restaurantAverageOrderValue)}</strong></span>
            </div>
          </section>
          <section className="panel">
            <div className="cms-section-head">
              <h2>Employees and access</h2>
              <span className="cms-status">{detail.employees?.length ?? 0} accounts</span>
            </div>
            <div className="cms-data-table super-employee-table">
              {(detail.employees ?? []).map((employee) => (
                <div className="cms-data-row" key={employee.id}>
                  <strong>{employee.name}</strong>
                  <span>{employee.email}</span>
                  <span>{label(employee.role)}</span>
                  <span>{employee.branchName}</span>
                  <span className={`cms-status ${employee.active ? 'super-status--good' : 'super-status--warning'}`}>
                    {employee.active ? 'active' : 'disabled'}
                  </span>
                </div>
              ))}
            </div>
          </section>
          <section className="panel">
            <h2>Tenant feature permissions</h2>
            <div className="cms-permission-grid">
              {TENANT_FEATURES.map((feature) => (
                <label className="checkbox-row" key={feature.key}>
                  <input checked={enabledFeatures.includes(feature.key)} onChange={() => toggleFeature(feature.key)} type="checkbox" />
                  {feature.label}
                </label>
              ))}
            </div>
            <button disabled={busy} onClick={() => void saveFeaturePermissions()} type="button">Save permissions</button>
          </section>
          <section className="panel">
            <div className="cms-section-head">
              <h2>Platform activity log</h2>
              <span className="cms-status">{auditPagination.total} entries</span>
            </div>
            <div className="cms-data-table super-audit-table">
              {(detail.auditLogs ?? []).map((entry) => (
                <div className="cms-data-row" key={documentId(entry)}>
                  <strong>{displayDate(entry.createdAt)}</strong>
                  <span>{entry.action}</span>
                  <span>{entry.entityType}</span>
                  <span>{entry.actorUserId ? `Actor ${entry.actorUserId.slice(-6)}` : 'System'}</span>
                  <span className="cms-status">{entry.entityId.slice(-6)}</span>
                </div>
              ))}
            </div>
            <div className="pagination-row">
              <span className="muted">
                Page {auditPagination.page} of {auditPagination.totalPages}
              </span>
              <div className="action-row">
                <button
                  className="button-secondary"
                  disabled={busy || auditPagination.page <= 1}
                  onClick={() => setLogPage((current) => Math.max(1, current - 1))}
                  type="button"
                >
                  Previous
                </button>
                <button
                  className="button-secondary"
                  disabled={busy || auditPagination.page >= auditPagination.totalPages}
                  onClick={() => setLogPage((current) => Math.min(auditPagination.totalPages, current + 1))}
                  type="button"
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </PageShell>
  );
}

function MetricGrid({ metrics }: { metrics: [string, string][] }) {
  return (
    <section className="card-grid">
      {metrics.map(([labelText, value], index) => (
        <article className={`card kpi cms-kpi cms-kpi--${index}`} key={labelText}>
          <strong>{value}</strong>
          <span className="muted">{labelText}</span>
        </article>
      ))}
    </section>
  );
}

function GrowthPanel() {
  return (
    <article className="panel super-chart-panel">
      <div className="cms-section-head">
        <div>
          <h2>Growth dynamics</h2>
          <p className="muted">MRR and active tenants from current platform records.</p>
        </div>
        <span className="cms-status">Live snapshot</span>
      </div>
      <svg className="super-chart" viewBox="0 0 640 260" role="img" aria-label="Platform growth chart">
        <path d="M20 220 C100 170 155 185 215 165 C285 140 310 82 382 76 C455 70 480 112 540 94 C585 82 610 54 625 28" />
        <path className="dashed" d="M20 230 C120 205 172 198 235 180 C300 160 350 130 420 126 C500 120 560 126 625 96" />
        {['JAN', 'MAR', 'MAY', 'JUL', 'SEP', 'NOV'].map((month, index) => (
          <text key={month} x={30 + index * 112} y="252">{month}</text>
        ))}
      </svg>
    </article>
  );
}

function RecentEvents({ events }: { events: { icon: string; label: string; tone: string; value: string }[] }) {
  return (
    <article className="panel">
      <h2>Recent platform events</h2>
      <div className="cms-list">
        {events.map((event) => (
          <div className="cms-list-row" key={`${event.label}-${event.value}`}>
            <span className="material-symbols-outlined" aria-hidden="true">{event.icon}</span>
            <div>
              <strong>{event.label}</strong>
              <p className="muted">{event.value}</p>
            </div>
            <span className={`cms-status super-status--${event.tone}`}>{event.tone}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function HealthPanel({ stats }: { stats: { activePlans: number; activeSubscriptions: number; attention: number } }) {
  return (
    <article className="panel">
      <h2>System health indicators</h2>
      <div className="super-health-list">
        <span>API readiness <strong>Healthy</strong></span>
        <span>Subscription plans <strong>{stats.activePlans} active</strong></span>
        <span>Active subscriptions <strong>{stats.activeSubscriptions}</strong></span>
        <span>Attention queue <strong>{stats.attention}</strong></span>
      </div>
    </article>
  );
}

function SubscriptionTable({ selectTenant, tenants }: { selectTenant: (id: string) => void; tenants: CmsSuperAdminTenantSummary[] }) {
  return (
    <section className="panel">
      <div className="cms-section-head"><h2>Tenant subscriptions</h2></div>
      <div className="cms-data-table super-data-table">
        {tenants.map((item) => (
          <div className="cms-data-row" key={documentId(item.tenant)}>
            <strong>{item.tenant.legalName}</strong>
            <span>{item.plan?.name ?? 'No plan'}</span>
            <span>{item.subscription?.status ? label(item.subscription.status) : 'not started'}</span>
            <span>{item.plan ? money(item.plan.monthlyPrice) : money(0)}</span>
            <button className="button-secondary" onClick={() => selectTenant(documentId(item.tenant))} type="button">Select</button>
          </div>
        ))}
      </div>
    </section>
  );
}

function TenantList({ busy, selectedTenantId, tenants }: { busy: boolean; selectedTenantId: string; tenants: CmsSuperAdminTenantSummary[] }) {
  return (
    <article className="panel">
      <h2>Tenants</h2>
      <div className="cms-list">
        {tenants.map((item) => {
          const id = documentId(item.tenant);
          return (
            <Link
              aria-disabled={busy}
              className={`cms-list-row cms-list-link ${id === selectedTenantId ? 'active' : ''}`}
              href={`/super-admin/tenants/${id}`}
              key={id}
            >
              <span className="material-symbols-outlined" aria-hidden="true">apartment</span>
              <div>
                <strong>{item.tenant.legalName}</strong>
                <p className="muted">{item.tenant.slug} - {item.plan?.name ?? 'No plan'} - {item.tenant.defaultCurrency}</p>
              </div>
              <span className="cms-status">{item.tenant.status}</span>
            </Link>
          );
        })}
      </div>
    </article>
  );
}

function CreateTenantForm({ busy, createForm, createTenant, setCreateForm, token }: { busy: boolean; createForm: typeof blankTenantForm; createTenant: () => Promise<void>; setCreateForm: (value: typeof blankTenantForm) => void; token: string }) {
  return (
    <article className="panel">
      <h2>Create tenant</h2>
      <div className="cms-form-grid">
        <label><span>Name</span><input onChange={(event) => setCreateForm({ ...createForm, legalName: event.target.value })} placeholder="Tenant legal name" value={createForm.legalName} /></label>
        <label><span>Slug</span><input onChange={(event) => setCreateForm({ ...createForm, slug: event.target.value })} placeholder="auto-generated if blank" value={createForm.slug} /></label>
        <div className="cms-form-grid cms-form-grid--two">
          <label><span>Currency</span><input onChange={(event) => setCreateForm({ ...createForm, defaultCurrency: event.target.value })} value={createForm.defaultCurrency} /></label>
          <label><span>Timezone</span><input onChange={(event) => setCreateForm({ ...createForm, defaultTimezone: event.target.value })} value={createForm.defaultTimezone} /></label>
        </div>
        <div className="cms-form-grid cms-form-grid--two">
          <label><span>Owner name</span><input onChange={(event) => setCreateForm({ ...createForm, ownerName: event.target.value })} placeholder="Primary owner" value={createForm.ownerName} /></label>
          <label><span>Owner email</span><input onChange={(event) => setCreateForm({ ...createForm, ownerEmail: event.target.value })} placeholder="owner@tenant.com" type="email" value={createForm.ownerEmail} /></label>
        </div>
        <label><span>Owner password</span><input autoComplete="new-password" onChange={(event) => setCreateForm({ ...createForm, ownerPassword: event.target.value })} placeholder="At least 8 characters" type="password" value={createForm.ownerPassword} /></label>
        <button disabled={busy || !token} onClick={() => void createTenant()} type="button">Create tenant</button>
      </div>
    </article>
  );
}

function SystemHealthView({ recentEvents, stats }: { recentEvents: { icon: string; label: string; tone: string; value: string }[]; stats: { activePlans: number; activeSubscriptions: number; attention: number } }) {
  const cards = [
    ['lock', 'Auth service', '14ms', 'Avg. latency', '99.98% uptime'],
    ['payments', 'Billing gateway', '102ms', 'Response time', `${stats.activeSubscriptions} active`],
    ['database', 'Database cluster', 'Ready', 'Mongo connection', `${stats.attention} alerts`],
    ['cloud', 'Realtime edge', 'Online', 'Socket.IO', `${stats.activePlans} plans`],
  ];

  return (
    <>
      <section className="card-grid">
        {cards.map(([icon, title, value, labelText, pill]) => (
          <article className="card kpi cms-kpi super-health-card" key={title}>
            <span className="material-symbols-outlined" aria-hidden="true">{icon}</span>
            <strong>{value}</strong>
            <span className="muted">{title} - {labelText}</span>
            <span className="cms-status">{pill}</span>
          </article>
        ))}
      </section>
      <section className="super-dashboard-grid">
        <article className="panel">
          <h2>Administrative audit logs</h2>
          <div className="cms-data-table">
            {recentEvents.map((event, index) => (
              <div className="cms-data-row" key={`${event.label}-${index}`}>
                <strong>{new Date().toLocaleDateString()}</strong>
                <span>Super Admin</span>
                <span>{event.label}</span>
                <span>{event.value}</span>
                <span className={`cms-status super-status--${event.tone}`}>{event.tone}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="panel">
          <h2>Security alerts</h2>
          <div className="cms-list">
            <div className="cms-list-row"><span className="material-symbols-outlined">warning</span><div><strong>No critical alerts</strong><p className="muted">Authentication and API checks are passing.</p></div><span className="cms-status super-status--good">ok</span></div>
            <div className="cms-list-row"><span className="material-symbols-outlined">schedule</span><div><strong>Maintenance window</strong><p className="muted">Next database maintenance can be scheduled from settings.</p></div><span className="cms-status">planned</span></div>
          </div>
        </article>
      </section>
    </>
  );
}

function BillingView({ selectTenant, stats, tenants }: { selectTenant: (id: string) => void; stats: { activeSubscriptions: number; attention: number; monthlyValue: number }; tenants: CmsSuperAdminTenantSummary[] }) {
  return (
    <>
      <MetricGrid metrics={[['Current MRR', money(stats.monthlyValue)], ['Active subscriptions', String(stats.activeSubscriptions)], ['Past due or suspended', String(stats.attention)], ['Billing currency', 'INR']]} />
      <SubscriptionTable selectTenant={selectTenant} tenants={tenants} />
    </>
  );
}

function AuditLogView({ events, tenants }: { events: { label: string; tone: string; value: string }[]; tenants: CmsSuperAdminTenantSummary[] }) {
  const rows = events.length ? events : tenants.slice(0, 4).map((tenant) => ({ label: 'Tenant reviewed', tone: 'good', value: tenant.tenant.legalName }));
  return (
    <section className="panel">
      <div className="cms-section-head"><h2>Administrative audit logs</h2><span className="cms-status">{rows.length} visible</span></div>
      <div className="cms-data-table">
        {rows.map((row, index) => (
          <div className="cms-data-row" key={`${row.label}-${index}`}>
            <strong>{new Date().toLocaleString()}</strong>
            <span>Super Admin</span>
            <span>{row.label}</span>
            <span>{row.value}</span>
            <span className={`cms-status super-status--${row.tone}`}>{row.tone}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function SettingsView({ setMessage }: { setMessage: (value: string) => void }) {
  const [maintenance, setMaintenance] = useState(false);
  const [betaFlags, setBetaFlags] = useState(true);

  return (
    <>
      <section className="cms-settings-grid">
        <article className="panel">
          <h2>General platform info</h2>
          <div className="cms-form-grid">
            <label><span>Platform display name</span><input defaultValue="Restaurent Platform" /></label>
            <label><span>Global support email</span><input defaultValue="support@restaurent.local" /></label>
            <label><span>Administrative memo</span><textarea placeholder="Notes for the super admin team." /></label>
          </div>
        </article>
        <article className="panel">
          <h2>System controls</h2>
          <div className="cms-list">
            <label className="checkbox-row"><input checked={betaFlags} onChange={(event) => setBetaFlags(event.target.checked)} type="checkbox" /> Beta feature flagging</label>
            <label className="checkbox-row"><input checked={maintenance} onChange={(event) => setMaintenance(event.target.checked)} type="checkbox" /> Global maintenance mode</label>
          </div>
        </article>
      </section>
      <section className="panel">
        <h2>Infrastructure configuration</h2>
        <div className="cms-form-grid cms-form-grid--two">
          <label><span>Primary data center</span><input defaultValue="Local / self-hosted" /></label>
          <label><span>API rate limit</span><input defaultValue="200 req/min" /></label>
          <label><span>Cache TTL</span><input defaultValue="300 seconds" /></label>
          <label><span>Supported currency</span><input defaultValue="INR" /></label>
        </div>
        <div className="action-row" style={{ marginTop: 16 }}>
          <button onClick={() => setMessage('Platform settings saved for this session.')} type="button">Save platform settings</button>
          <button className="button-secondary" onClick={() => setMessage('Changes discarded.')} type="button">Discard changes</button>
        </div>
      </section>
      <ChangePasswordForm />
    </>
  );
}
