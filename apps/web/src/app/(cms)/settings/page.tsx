'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { ChangePasswordForm } from '@/components/change-password-form';
import { useCmsSession } from '@/components/cms-session-provider';
import { ErrorState } from '@/components/error-state';
import { FormActions, FormField, FormGrid } from '@/components/form-field';
import { PageShell } from '@/components/page-shell';
import { SectionCard } from '@/components/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { documentId, getCmsBranches, getCmsTenants, updateCmsBranch, type CmsBranch, type CmsTenant } from '@/lib/api-client';
import { errorMessage } from '@/lib/async-state';
import { readCmsSettings } from '@/lib/cms-storage';

const serviceModes = [
  { label: 'Waiter confirmed', value: 'waiter_confirmed' },
  { label: 'Self-service', value: 'self_service' },
  { label: 'Hybrid', value: 'hybrid' },
];

export default function SettingsPage() {
  const { can } = useCmsSession();
  const [branchForm, setBranchForm] = useState({ addressLine1: '', city: '', hours: '', name: '', serviceMode: 'waiter_confirmed' });
  const [tenant, setTenant] = useState<CmsTenant | null>(null);
  const [branch, setBranch] = useState<CmsBranch | null>(null);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    const settings = readCmsSettings();
    setToken(settings.token);
    if (!settings.tenantId || !settings.branchId || !settings.token) return;
    void Promise.all([getCmsTenants(settings.token), getCmsBranches(settings.tenantId, settings.token)])
      .then(([tenants, branches]) => {
        const nextBranch = branches.find((item) => (item._id ?? item.id) === settings.branchId) ?? branches[0] ?? null;
        setTenant(tenants.find((item) => (item._id ?? item.id) === settings.tenantId) ?? tenants[0] ?? null);
        setBranch(nextBranch);
        if (nextBranch) {
          const address = nextBranch.address as { city?: string; line1?: string } | undefined;
          setBranchForm({
            addressLine1: address?.line1 ?? '',
            city: address?.city ?? '',
            hours: JSON.stringify(nextBranch.hours ?? {}, null, 2),
            name: nextBranch.name,
            serviceMode: nextBranch.serviceMode,
          });
        }
      })
      .catch((error: unknown) => setLoadError(errorMessage(error, 'Could not load settings.')));
  }, []);

  async function saveBranch(): Promise<void> {
    if (!branch || !token) {
      toast.error('Sign in to update outlet settings.');
      return;
    }
    setSaving(true);
    try {
      const hours = branchForm.hours.trim() ? JSON.parse(branchForm.hours) : {};
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
      setBranch(nextBranch);
      toast.success('Outlet settings saved');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not save outlet settings. Check the hours JSON.'));
    } finally {
      setSaving(false);
    }
  }

  const canManageBranchSettings = can('settings:edit');

  return (
    <PageShell description="Your login security and the workspace defaults your role can change." eyebrow="Settings" title="Settings">
      {loadError ? <ErrorState message={loadError} /> : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <SectionCard description="Set by the platform when the restaurant was onboarded." title="Restaurant profile">
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
        </SectionCard>

        {canManageBranchSettings ? (
          <SectionCard description="Defaults for the outlet you are currently working in." title="Outlet defaults">
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
          </SectionCard>
        ) : null}

        <ChangePasswordForm token={token} />
      </section>
    </PageShell>
  );
}
