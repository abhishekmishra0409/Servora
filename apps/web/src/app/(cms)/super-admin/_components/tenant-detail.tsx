'use client';

import { DEFAULT_TENANT_FEATURES, TENANT_FEATURES } from '@restaurent/shared';
import { ArrowLeft, IndianRupee, ReceiptText, Users, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { DataTable } from '@/components/data-table';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { FormActions, FormField, FormGrid } from '@/components/form-field';
import { LoadingCards } from '@/components/loading-state';
import { PageHeader } from '@/components/page-header';
import { PageShell } from '@/components/page-shell';
import { SectionCard } from '@/components/section-card';
import { StatCard, StatGrid } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  documentId,
  getSuperAdminTenant,
  updateSuperAdminTenant,
  updateSuperAdminTenantFeatures,
  type CmsSuperAdminTenantDetail,
} from '@/lib/api-client';
import { errorMessage, failed, loading, ready, type AsyncState } from '@/lib/async-state';
import { readCmsSettings } from '@/lib/cms-storage';
import { formatDateTime, shortId } from '@/lib/format';
import { humanize } from '@/lib/status-tone';

import { blankTenantForm, platformMoney } from './platform-console';

const tenantStatuses = ['active', 'suspended', 'archived'];
const auditLimit = 10;
const displayDate = (value?: string): string => (value ? new Date(value).toLocaleDateString() : 'Not set');

function DetailList({ rows }: { rows: [string, ReactNode][] }): ReactNode {
  return (
    <dl className="divide-y text-sm">
      {rows.map(([label, value]) => (
        <div className="flex items-center justify-between gap-3 py-2.5" key={label}>
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="text-right font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function TenantDetail({ tenantId }: { tenantId: string }): ReactNode {
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<CmsSuperAdminTenantDetail | null>(null);
  const [editingTenant, setEditingTenant] = useState(false);
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>([]);
  const [logPage, setLogPage] = useState(1);
  const [state, setState] = useState<AsyncState>(loading);
  const [tenantForm, setTenantForm] = useState(blankTenantForm);
  const [token, setToken] = useState('');

  useEffect(() => {
    setLogPage(1);
  }, [tenantId]);

  useEffect(() => {
    const settings = readCmsSettings();
    setToken(settings.token);
    if (!settings.token) {
      setState(failed(new Error('Sign in as a platform admin to view tenant detail.')));
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
    setState(ready);
  }

  async function loadTenantDetail(nextToken = token, nextLogPage = logPage): Promise<void> {
    setBusy(true);
    try {
      applyDetail(await getSuperAdminTenant(tenantId, nextToken, { auditLimit, auditPage: nextLogPage }));
    } catch (error) {
      setState(failed(error, 'Could not load tenant detail.'));
    } finally {
      setBusy(false);
    }
  }

  async function saveTenantDetails(): Promise<void> {
    if (!detail || !token) return;
    setBusy(true);
    try {
      applyDetail(await updateSuperAdminTenant(documentId(detail.tenant), tenantForm, token));
      setEditingTenant(false);
      toast.success('Tenant account updated');
      await loadTenantDetail(token, logPage);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not update tenant.'));
    } finally {
      setBusy(false);
    }
  }

  async function saveFeaturePermissions(): Promise<void> {
    if (!detail || !token) return;
    setBusy(true);
    try {
      applyDetail(await updateSuperAdminTenantFeatures(documentId(detail.tenant), enabledFeatures, token));
      toast.success('Tenant features updated');
      await loadTenantDetail(token, logPage);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not update tenant features.'));
    } finally {
      setBusy(false);
    }
  }

  function toggleFeature(feature: string): void {
    setEnabledFeatures((current) => (current.includes(feature) ? current.filter((item) => item !== feature) : [...current, feature]));
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
    limit: auditLimit,
    page: logPage,
    total: detail?.auditLogs?.length ?? 0,
    totalPages: 1,
  };

  return (
    <PageShell>
      <PageHeader
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/super-admin/tenants">
              <ArrowLeft />
              Back to tenants
            </Link>
          </Button>
        }
        description="Account details, owner-created staff, subscription revenue, and platform activity for this restaurant."
        eyebrow="Tenant"
        onRefresh={() => void loadTenantDetail()}
        refreshing={busy}
        title={detail?.tenant.legalName ?? 'Tenant detail'}
      />

      {state.status === 'error' ? <ErrorState message={state.error ?? ''} onRetry={() => void loadTenantDetail()} /> : null}
      {state.status === 'loading' ? <LoadingCards count={4} /> : null}

      {detail ? (
        <>
          <StatGrid>
            <StatCard icon={IndianRupee} label="Current MRR" tone="primary" value={platformMoney(business.currentMrr)} />
            <StatCard icon={Wallet} label="App revenue" tone="info" value={platformMoney(business.lifetimeValue)} />
            <StatCard icon={ReceiptText} label="Restaurant revenue" tone="success" value={platformMoney(business.restaurantRevenue)} />
            <StatCard icon={Users} label="Employees" value={business.employeeCount} />
          </StatGrid>

          <section className="grid gap-4 lg:grid-cols-2">
            <SectionCard
              actions={
                <Button disabled={busy} onClick={() => setEditingTenant((current) => !current)} size="sm" type="button" variant="outline">
                  {editingTenant ? 'Close' : 'Edit'}
                </Button>
              }
              title="Tenant account"
            >
              {editingTenant ? (
                <>
                  <FormField htmlFor="detail-name" label="Name">
                    <Input id="detail-name" onChange={(event) => setTenantForm({ ...tenantForm, legalName: event.target.value })} value={tenantForm.legalName} />
                  </FormField>
                  <FormField htmlFor="detail-slug" label="Slug">
                    <Input id="detail-slug" onChange={(event) => setTenantForm({ ...tenantForm, slug: event.target.value })} value={tenantForm.slug} />
                  </FormField>
                  <FormField htmlFor="detail-status" label="Status">
                    <Select onValueChange={(value) => setTenantForm({ ...tenantForm, status: value })} value={tenantForm.status}>
                      <SelectTrigger className="w-full" id="detail-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {tenantStatuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {humanize(status)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormGrid>
                    <FormField htmlFor="detail-currency" label="Currency">
                      <Input id="detail-currency" onChange={(event) => setTenantForm({ ...tenantForm, defaultCurrency: event.target.value })} value={tenantForm.defaultCurrency} />
                    </FormField>
                    <FormField htmlFor="detail-timezone" label="Timezone">
                      <Input id="detail-timezone" onChange={(event) => setTenantForm({ ...tenantForm, defaultTimezone: event.target.value })} value={tenantForm.defaultTimezone} />
                    </FormField>
                  </FormGrid>
                  <FormActions>
                    <Button disabled={busy} onClick={() => void saveTenantDetails()} type="button">
                      Save tenant
                    </Button>
                  </FormActions>
                </>
              ) : (
                <DetailList
                  rows={[
                    ['Legal name', detail.tenant.legalName],
                    ['Slug', `/${detail.tenant.slug}`],
                    ['Status', <StatusBadge key="status" kind="tenant" value={detail.tenant.status} />],
                    ['Outlets', business.branchCount],
                    ['Features enabled', business.enabledFeatureCount],
                  ]}
                />
              )}
            </SectionCard>

            <SectionCard title="Subscription revenue">
              <DetailList
                rows={[
                  ['Plan', business.planName],
                  ['Status', <StatusBadge key="sub" kind="subscription" value={business.subscriptionStatus} />],
                  ['Monthly value', platformMoney(business.currentMrr)],
                  ['Annualized value', platformMoney(business.annualizedRevenue)],
                  ['Renews at', displayDate(business.renewsAt)],
                ]}
              />
            </SectionCard>
          </section>

          <SectionCard actions={<Badge variant="secondary">{business.restaurantOrderCount} orders</Badge>} title="Restaurant revenue">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['Total sales recorded', platformMoney(business.restaurantRevenue)],
                ['This month', platformMoney(business.restaurantRevenueThisMonth)],
                ['Orders this month', String(business.restaurantThisMonthOrderCount)],
                ['Average order value', platformMoney(business.restaurantAverageOrderValue)],
              ].map(([label, value]) => (
                <div className="rounded-lg border bg-background px-4 py-3" key={label}>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                  <p className="font-display text-xl font-semibold tabular-nums">{value}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard actions={<Badge variant="secondary">{detail.employees?.length ?? 0} accounts</Badge>} contentClassName="space-y-0" title="Employees and access">
            <DataTable
              columns={[
                {
                  header: 'Name',
                  key: 'name',
                  render: (employee) => (
                    <span className="grid">
                      <span className="font-semibold">{employee.name}</span>
                      <span className="text-xs text-muted-foreground">{employee.email}</span>
                    </span>
                  ),
                },
                { header: 'Role', key: 'role', render: (employee) => humanize(employee.role) },
                { header: 'Outlet', key: 'branch', render: (employee) => employee.branchName },
                {
                  header: 'Login',
                  key: 'active',
                  render: (employee) => <StatusBadge kind="tenant" label={employee.active ? 'Active' : 'Disabled'} value={employee.active ? 'active' : 'suspended'} />,
                },
              ]}
              empty={<EmptyState compact icon={Users} title="No employees yet" />}
              rowKey={(employee) => employee.id}
              rows={detail.employees ?? []}
            />
          </SectionCard>

          <SectionCard description="Modules this restaurant can use, regardless of its plan counts." title="Feature permissions">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {TENANT_FEATURES.map((feature) => (
                <label className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm" key={feature.key}>
                  <Checkbox checked={enabledFeatures.includes(feature.key)} onCheckedChange={() => toggleFeature(feature.key)} />
                  {feature.label}
                </label>
              ))}
            </div>
            <FormActions>
              <Button disabled={busy} onClick={() => void saveFeaturePermissions()} type="button">
                Save features
              </Button>
            </FormActions>
          </SectionCard>

          <SectionCard actions={<Badge variant="secondary">{auditPagination.total} entries</Badge>} contentClassName="space-y-4" title="Activity log">
            <DataTable
              columns={[
                { header: 'When', key: 'when', render: (entry) => <span className="whitespace-nowrap text-muted-foreground">{formatDateTime(entry.createdAt) || 'Unknown'}</span> },
                { header: 'Action', key: 'action', render: (entry) => <span className="font-medium">{humanize(entry.action)}</span> },
                { header: 'Entity', key: 'entity', render: (entry) => `${humanize(entry.entityType)} ···${shortId(entry.entityId)}` },
                { header: 'Actor', key: 'actor', render: (entry) => (entry.actorUserId ? `User ···${shortId(entry.actorUserId)}` : 'System') },
              ]}
              empty={<EmptyState compact icon={ReceiptText} title="No activity recorded" />}
              rowKey={documentId}
              rows={detail.auditLogs ?? []}
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Page {auditPagination.page} of {auditPagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button disabled={busy || auditPagination.page <= 1} onClick={() => setLogPage((current) => Math.max(1, current - 1))} size="sm" type="button" variant="outline">
                  Previous
                </Button>
                <Button
                  disabled={busy || auditPagination.page >= auditPagination.totalPages}
                  onClick={() => setLogPage((current) => Math.min(auditPagination.totalPages, current + 1))}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            </div>
          </SectionCard>
        </>
      ) : null}
    </PageShell>
  );
}
