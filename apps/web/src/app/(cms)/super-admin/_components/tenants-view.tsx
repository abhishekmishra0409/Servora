'use client';

import { TENANT_FEATURES } from '@restaurent/shared';
import { Building2, ChevronRight, LayoutGrid, Plus, TriangleAlert, CircleCheckBig } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { EmptyState } from '@/components/empty-state';
import { FormActions, FormField, FormGrid } from '@/components/form-field';
import { LoadingRows } from '@/components/loading-state';
import { SectionCard } from '@/components/section-card';
import { StatCard, StatGrid } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { documentId } from '@/lib/api-client';
import { cn } from '@/lib/utils';

import { usePlatformConsole } from './platform-console';
import { PlatformPage } from './platform-page';

export function TenantsView(): ReactNode {
  const console = usePlatformConsole();
  const { busy, createForm, selectedTenantId, setCreateForm, state, stats, tenants, token } = console;

  return (
    <PlatformPage
      description="Create tenants, edit account data, and manage which features each restaurant can use."
      onRefresh={() => void console.load()}
      refreshing={busy}
      state={state}
      title="Tenants"
    >
      <StatGrid>
        <StatCard loading={state.status === 'loading'} icon={Building2} label="Total tenants" tone="primary" value={stats.totalTenants} />
        <StatCard loading={state.status === 'loading'} icon={CircleCheckBig} label="Active tenants" tone="success" value={stats.activeTenants} />
        <StatCard loading={state.status === 'loading'} icon={TriangleAlert} label="Suspended or at risk" tone={stats.attention > 0 ? 'warning' : 'default'} value={stats.attention} />
        <StatCard loading={state.status === 'loading'} icon={LayoutGrid} label="Feature modules" value={TENANT_FEATURES.length} />
      </StatGrid>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <SectionCard title={`${tenants.length} tenants`}>
          {state.status === 'loading' ? (
            <LoadingRows count={4} />
          ) : tenants.length === 0 ? (
            <EmptyState compact description="Create the first tenant using the form." icon={Building2} title="No tenants yet" />
          ) : (
            <ul className="divide-y">
              {tenants.map((item) => {
                const id = documentId(item.tenant);
                return (
                  <li key={id}>
                    <Link
                      aria-disabled={busy}
                      className={cn(
                        '-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-accent/40',
                        id === selectedTenantId && 'bg-accent/30',
                      )}
                      href={`/super-admin/tenants/${id}`}
                    >
                      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                        <Building2 aria-hidden="true" className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{item.tenant.legalName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          /{item.tenant.slug} · {item.plan?.name ?? 'No plan'} · {item.tenant.defaultCurrency}
                        </p>
                      </div>
                      <StatusBadge kind="tenant" value={item.tenant.status} />
                      <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard description="The owner account is created with the tenant and can sign in right away." title="Create tenant">
          <FormField htmlFor="tenant-legal-name" label="Restaurant name" required>
            <Input
              id="tenant-legal-name"
              onChange={(event) => setCreateForm({ ...createForm, legalName: event.target.value })}
              placeholder="Tenant legal name"
              value={createForm.legalName}
            />
          </FormField>
          <FormField hint="Auto-generated from the name when left blank." htmlFor="tenant-slug" label="Slug">
            <Input id="tenant-slug" onChange={(event) => setCreateForm({ ...createForm, slug: event.target.value })} value={createForm.slug} />
          </FormField>
          <FormGrid>
            <FormField htmlFor="tenant-currency" label="Currency">
              <Input id="tenant-currency" onChange={(event) => setCreateForm({ ...createForm, defaultCurrency: event.target.value })} value={createForm.defaultCurrency} />
            </FormField>
            <FormField htmlFor="tenant-timezone" label="Timezone">
              <Input id="tenant-timezone" onChange={(event) => setCreateForm({ ...createForm, defaultTimezone: event.target.value })} value={createForm.defaultTimezone} />
            </FormField>
            <FormField htmlFor="tenant-owner-name" label="Owner name">
              <Input id="tenant-owner-name" onChange={(event) => setCreateForm({ ...createForm, ownerName: event.target.value })} placeholder="Primary owner" value={createForm.ownerName} />
            </FormField>
            <FormField htmlFor="tenant-owner-email" label="Owner email" required>
              <Input
                id="tenant-owner-email"
                onChange={(event) => setCreateForm({ ...createForm, ownerEmail: event.target.value })}
                placeholder="owner@restaurant.com"
                type="email"
                value={createForm.ownerEmail}
              />
            </FormField>
          </FormGrid>
          <FormField hint="At least 8 characters." htmlFor="tenant-owner-password" label="Owner password" required>
            <Input
              autoComplete="new-password"
              id="tenant-owner-password"
              onChange={(event) => setCreateForm({ ...createForm, ownerPassword: event.target.value })}
              type="password"
              value={createForm.ownerPassword}
            />
          </FormField>
          <FormActions>
            <Button disabled={busy || !token} onClick={() => void console.createTenant()} type="button">
              <Plus />
              Create tenant
            </Button>
          </FormActions>
        </SectionCard>
      </section>
    </PlatformPage>
  );
}
