'use client';

import { useEffect, useState } from 'react';

import { ChangePasswordForm } from '../../../components/change-password-form';
import { PageShell } from '../../../components/page-shell';
import { documentId, getCmsBranches, getCmsTenants, updateCmsBranch, type CmsBranch, type CmsTenant } from '../../../lib/api-client';
import { readCmsSettings } from '../../../lib/cms-storage';

export default function SettingsPage() {
  const [branchForm, setBranchForm] = useState({ addressLine1: '', city: '', hours: '', name: '', serviceMode: 'waiter_confirmed' });
  const [tenant, setTenant] = useState<CmsTenant | null>(null);
  const [branch, setBranch] = useState<CmsBranch | null>(null);
  const [message, setMessage] = useState('Sign in to load settings from the database.');
  const [role, setRole] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    const settings = readCmsSettings();
    setRole(settings.role);
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
        setMessage('');
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Could not load settings.'));
  }, []);

  async function saveBranch(): Promise<void> {
    if (!branch || !token) {
      setMessage('Sign in to update branch settings.');
      return;
    }
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
      setMessage('Branch settings saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save branch settings.');
    }
  }

  const canManageBranchSettings = ['owner', 'manager'].includes(role);

  return (
    <PageShell eyebrow="Settings" title="Account and workspace settings" description="Manage your login security and workspace defaults available to your role.">
      {message ? <p className="notice-text">{message}</p> : null}
      <section className="cms-settings-grid">
        <article className="panel"><h2>Restaurant profile</h2><div className="form-stack"><label>Restaurant<input readOnly value={tenant?.legalName ?? ''} /></label><label>Currency<input readOnly value={tenant?.defaultCurrency ?? ''} /></label><label>Timezone<input readOnly value={tenant?.defaultTimezone ?? ''} /></label></div></article>
        {canManageBranchSettings ? (
          <article className="panel">
            <div className="cms-section-head"><h2>Branch defaults</h2></div>
            <div className="form-stack">
              <label>Branch<input value={branchForm.name} onChange={(event) => setBranchForm({ ...branchForm, name: event.target.value })} /></label>
              <label>Service mode<select value={branchForm.serviceMode} onChange={(event) => setBranchForm({ ...branchForm, serviceMode: event.target.value })}><option value="waiter_confirmed">Waiter confirmed</option><option value="self_service">Self-service</option><option value="hybrid">Hybrid</option></select></label>
              <label>Address line<input value={branchForm.addressLine1} onChange={(event) => setBranchForm({ ...branchForm, addressLine1: event.target.value })} /></label>
              <label>City<input value={branchForm.city} onChange={(event) => setBranchForm({ ...branchForm, city: event.target.value })} /></label>
              <label>Hours JSON<textarea value={branchForm.hours} onChange={(event) => setBranchForm({ ...branchForm, hours: event.target.value })} /></label>
              <button onClick={() => void saveBranch()} type="button">Save branch settings</button>
            </div>
          </article>
        ) : null}
        <ChangePasswordForm token={token} />
      </section>
    </PageShell>
  );
}
