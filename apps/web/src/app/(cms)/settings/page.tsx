'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { ChangePasswordForm } from '@/components/change-password-form';
import { useCmsSession } from '@/components/cms-session-provider';
import { FormActions, FormField, FormGrid } from '@/components/form-field';
import { LoadingForm } from '@/components/loading-state';
import { PageShell } from '@/components/page-shell';
import { ResourceNotice, showsContent } from '@/components/resource-notice';
import { SectionCard } from '@/components/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { documentId, getCmsBranches, getCmsTenants, updateCmsBranch, type CmsBranch, type CmsTenant } from '@/lib/api-client';
import { errorMessage } from '@/lib/async-state';
import { readCmsContext, useCmsResource } from '@/lib/use-cms-resource';

const serviceModes = [
  { label: 'Waiter confirmed', value: 'waiter_confirmed' },
  { label: 'Self-service', value: 'self_service' },
  { label: 'Hybrid', value: 'hybrid' },
];

const emptyBranchForm = { addressLine1: '', city: '', hours: '', name: '', serviceMode: 'waiter_confirmed' };

function formFor(branch: CmsBranch | null): typeof emptyBranchForm {
  if (!branch) return emptyBranchForm;
  const address = branch.address as { city?: string; line1?: string } | undefined;
  return {
    addressLine1: address?.line1 ?? '',
    city: address?.city ?? '',
    hours: JSON.stringify(branch.hours ?? {}, null, 2),
    name: branch.name,
    serviceMode: branch.serviceMode,
  };
}

export default function SettingsPage() {
  const { can } = useCmsSession();
  const [branchForm, setBranchForm] = useState(emptyBranchForm);
  const [saving, setSaving] = useState(false);

  const resource = useCmsResource<{ branch: CmsBranch | null; tenant: CmsTenant | null }>(
    async ({ branchId, tenantId, token }) => {
      const [tenants, branches] = await Promise.all([getCmsTenants(token), getCmsBranches(tenantId, token)]);
      return {
        branch: branches.find((item) => documentId(item) === branchId) ?? branches[0] ?? null,
        tenant: tenants.find((item) => documentId(item) === tenantId) ?? tenants[0] ?? null,
      };
    },
    { initial: { branch: null, tenant: null } },
  );
  const { branch, tenant } = resource.data;
  const loading = resource.status === 'loading';

  useEffect(() => {
    setBranchForm(formFor(branch));
  }, [branch]);

  async function saveBranch(): Promise<void> {
    const { token } = readCmsContext();
    if (!branch || !token) {
      toast.error('Sign in to update outlet settings.');
      return;
    }
    let hours: Record<string, unknown>;
    try {
      hours = branchForm.hours.trim() ? (JSON.parse(branchForm.hours) as Record<string, unknown>) : {};
    } catch {
      toast.error('Opening hours must be valid JSON.');
      return;
    }
    setSaving(true);
    try {
      const nextBranch = await updateCmsBranch(
        documentId(branch),
        {
          address: { ...(branch.address ?? {}), city: branchForm.city, line1: branchForm.addressLine1 },
          hours,
          name: branchForm.name,
          serviceMode: branchForm.serviceMode,
        },
        token,
      );
      resource.setData((current) => ({ ...current, branch: nextBranch }));
      toast.success('Outlet settings saved');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not save outlet settings.'));
    } finally {
      setSaving(false);
    }
  }

  const canManageBranchSettings = can('settings:edit');

  return (
    <PageShell description="Your login security and the workspace defaults your role can change." eyebrow="Settings" title="Settings">
      {/* Password changes work without an outlet, so only the workspace cards wait on data. */}
      <ResourceNotice resource={resource} what="workspace settings" />

      <section className="grid gap-4 lg:grid-cols-2">
        {showsContent(resource) ? (
          <SectionCard description="Set by the platform when the restaurant was onboarded." title="Restaurant profile">
            {loading ? (
              <LoadingForm fields={3} />
            ) : (
              <>
                <FormField htmlFor="tenant-name" label="Restaurant">
                  <Input id="tenant-name" readOnly value={tenant?.legalName ?? ''} />
                </FormField>
                <FormGrid>
                  <FormField htmlFor="tenant-currency" label="Currency">
                    <Input id="tenant-currency" readOnly value={tenant?.defaultCurrency ?? ''} />
                  </FormField>
                  <FormField htmlFor="tenant-timezone" label="Timezone">
                    <Input id="tenant-timezone" readOnly value={tenant?.defaultTimezone ?? ''} />
                  </FormField>
                </FormGrid>
              </>
            )}
          </SectionCard>
        ) : null}

        {showsContent(resource) && canManageBranchSettings ? (
          <SectionCard description="Defaults for the outlet you are currently working in." title="Outlet defaults">
            {loading ? (
              <LoadingForm fields={5} />
            ) : (
              <>
                <FormField htmlFor="branch-name" label="Outlet name">
                  <Input id="branch-name" onChange={(event) => setBranchForm({ ...branchForm, name: event.target.value })} value={branchForm.name} />
                </FormField>
                <FormField hint="Decides whether a waiter confirms guest orders before the kitchen sees them." htmlFor="branch-mode" label="Service mode">
                  <Select onValueChange={(value) => setBranchForm({ ...branchForm, serviceMode: value })} value={branchForm.serviceMode}>
                    <SelectTrigger className="w-full" id="branch-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceModes.map((mode) => (
                        <SelectItem key={mode.value} value={mode.value}>
                          {mode.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormGrid>
                  <FormField htmlFor="branch-address" label="Address line">
                    <Input id="branch-address" onChange={(event) => setBranchForm({ ...branchForm, addressLine1: event.target.value })} value={branchForm.addressLine1} />
                  </FormField>
                  <FormField htmlFor="branch-city" label="City">
                    <Input id="branch-city" onChange={(event) => setBranchForm({ ...branchForm, city: event.target.value })} value={branchForm.city} />
                  </FormField>
                </FormGrid>
                <FormField hint="Opening hours as JSON." htmlFor="branch-hours" label="Hours">
                  <Textarea className="font-mono text-xs" id="branch-hours" onChange={(event) => setBranchForm({ ...branchForm, hours: event.target.value })} rows={6} value={branchForm.hours} />
                </FormField>
                <FormActions>
                  <Button disabled={saving} onClick={() => void saveBranch()} type="button">
                    Save outlet settings
                  </Button>
                </FormActions>
              </>
            )}
          </SectionCard>
        ) : null}

        <ChangePasswordForm />
      </section>
    </PageShell>
  );
}
