'use client';

import { ArrowRight, Pencil, Plus, ShieldCheck, Trash2, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

import { useCmsSession } from '@/components/cms-session-provider';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table';
import { EmptyState } from '@/components/empty-state';
import { FormActions, FormField, FormGrid } from '@/components/form-field';
import { PageShell } from '@/components/page-shell';
import { PlanLimitNotice, UsageStrip } from '@/components/plan-limit-notice';
import { SectionCard } from '@/components/section-card';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ApiError,
  createCmsStaff,
  deleteCmsStaff,
  getCmsRoles,
  getCmsStaff,
  updateCmsStaff,
  type CmsRole,
  type CmsStaffMember,
} from '@/lib/api-client';
import { errorMessage } from '@/lib/async-state';
import { humanize } from '@/lib/status-tone';
import { useCmsResource } from '@/lib/use-cms-resource';

const emptyForm = { active: true, email: '', name: '', password: '', role: 'waiter' };

export default function StaffPage() {
  const session = useCmsSession();
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [limitError, setLimitError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);

  const branchId = session.branchId;
  const tenantId = session.tenantId;
  const token = session.token;

  const canAdd = session.can('staff:add');
  const canEdit = session.can('staff:edit');
  const canDelete = session.can('staff:delete');
  const canManageRoles = session.can('roles:view');

  const resource = useCmsResource<{ roles: CmsRole[]; staff: CmsStaffMember[] }>(
    async (context) => {
      const staff = await getCmsStaff(context.branchId, context.token);
      // The role picker must offer this tenant's custom roles, not a hardcoded
      // list. A user without roles:view simply keeps the built-in names.
      const roles = canManageRoles ? await getCmsRoles(context.tenantId, context.token).catch(() => []) : [];
      return { roles, staff };
    },
    { deps: [branchId, canManageRoles], initial: { roles: [], staff: [] } },
  );
  const { roles, staff } = resource.data;

  function resetForm(): void {
    setEditingId('');
    setForm(emptyForm);
    setLimitError(null);
  }

  function edit(member: CmsStaffMember): void {
    setEditingId(member.id);
    setForm({ active: member.active, email: member.email, name: member.name, password: '', role: member.role });
    window.scrollTo({ behavior: 'smooth', top: 0 });
  }

  async function submit(): Promise<void> {
    if (!tenantId || !branchId || !token || !form.name.trim()) {
      toast.error('Give the staff member a name.');
      return;
    }

    setLimitError(null);
    setSaving(true);

    try {
      if (editingId) {
        await updateCmsStaff(editingId, { active: form.active, name: form.name.trim(), role: form.role }, token);
        toast.success('Staff member updated');
      } else {
        if (!form.email.trim() || !form.password) {
          toast.error('Email and password are required for new staff.');
          return;
        }
        await createCmsStaff(
          { branchId, email: form.email.trim(), name: form.name.trim(), password: form.password, role: form.role, tenantId },
          token,
        );
        toast.success('Staff member created');
      }

      resetForm();
      await resource.reload();
      await session.refreshEntitlements();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PLAN_LIMIT_REACHED') {
        setLimitError(error);
      } else {
        toast.error(errorMessage(error, 'Could not save staff member.'));
      }
    } finally {
      setSaving(false);
    }
  }

  async function remove(member: CmsStaffMember): Promise<void> {
    if (!token) return;
    try {
      await deleteCmsStaff(member.id, token);
      toast.success(`${member.name} removed`);
      await resource.reload();
      await session.refreshEntitlements();
    } catch (error) {
      toast.error(errorMessage(error, 'Could not remove staff member.'));
      throw error;
    }
  }

  const builtInRoles = roles.filter((role) => role.builtIn);
  const customRoles = roles.filter((role) => !role.builtIn);
  const roleName = (key: string): string => roles.find((role) => role.key === key)?.name ?? humanize(key);
  const staffCap = session.entitlements?.limits.employees ?? 0;
  const staffUsed = session.entitlements?.usage.employees ?? staff.length;
  const atCap = staffCap > 0 && staffUsed >= staffCap;

  return (
    <PageShell
      resource={resource}
      what="staff"
      actions={
        canManageRoles ? (
          <Button asChild variant="outline">
            <Link href="/staff/roles">
              <ShieldCheck />
              Manage roles
            </Link>
          </Button>
        ) : undefined
      }
      description="Everyone who signs in to this outlet, and the role that decides what they can see and change."
      eyebrow="Team"
      title="Staff"
    >
      <PlanLimitNotice error={limitError} resource="staff accounts" />
      <UsageStrip cap={staffCap} label="Staff accounts" used={staffUsed} />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        {canAdd || canEdit ? (
          <SectionCard
            actions={
              editingId ? (
                <Button onClick={resetForm} size="sm" type="button" variant="ghost">
                  Cancel
                </Button>
              ) : undefined
            }
            title={editingId ? 'Update staff member' : 'Add staff member'}
          >
            <FormGrid>
              <FormField htmlFor="staff-name" label="Name" required>
                <Input id="staff-name" onChange={(event) => setForm({ ...form, name: event.target.value })} value={form.name} />
              </FormField>
              <FormField htmlFor="staff-email" label="Email" required={!editingId}>
                <Input
                  disabled={Boolean(editingId)}
                  id="staff-email"
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  type="email"
                  value={form.email}
                />
              </FormField>
              {!editingId ? (
                <FormField hint="At least 8 characters. They can change it after signing in." htmlFor="staff-password" label="Password" required>
                  <Input
                    autoComplete="new-password"
                    id="staff-password"
                    onChange={(event) => setForm({ ...form, password: event.target.value })}
                    type="password"
                    value={form.password}
                  />
                </FormField>
              ) : null}
              <FormField htmlFor="staff-role" label="Role">
                <Select onValueChange={(value) => setForm({ ...form, role: value })} value={form.role}>
                  <SelectTrigger className="w-full" id="staff-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.length === 0 ? (
                      <SelectItem value={form.role}>{humanize(form.role)}</SelectItem>
                    ) : (
                      <>
                        <SelectGroup>
                          <SelectLabel>Built-in</SelectLabel>
                          {builtInRoles.map((role) => (
                            <SelectItem key={role.key} value={role.key}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                        {customRoles.length > 0 ? (
                          <SelectGroup>
                            <SelectLabel>Custom roles</SelectLabel>
                            {customRoles.map((role) => (
                              <SelectItem key={role.key} value={role.key}>
                                {role.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ) : null}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </FormField>
            </FormGrid>
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox checked={form.active} onCheckedChange={(checked) => setForm({ ...form, active: checked === true })} />
              Active login
            </label>
            <FormActions>
              <Button
                disabled={saving || (!editingId && atCap)}
                onClick={() => void submit()}
                title={!editingId && atCap ? 'Your plan’s staff limit is reached' : undefined}
                type="button"
              >
                {editingId ? null : <Plus />}
                {editingId ? 'Update staff member' : 'Create staff member'}
              </Button>
            </FormActions>
          </SectionCard>
        ) : null}

        <SectionCard title="How access works">
          <p className="text-sm text-muted-foreground">
            Each person gets one role per outlet, and the role decides which screens they see and what they can change
            there. Build a role that matches your restaurant on the roles screen, then pick it here.
          </p>
          {canManageRoles ? (
            <Button asChild className="px-0" variant="link">
              <Link href="/staff/roles">
                Build or edit roles
                <ArrowRight />
              </Link>
            </Button>
          ) : null}
        </SectionCard>
      </section>

      <SectionCard contentClassName="space-y-0" title={resource.status === 'loading' ? 'Team' : `${staff.length} ${staff.length === 1 ? 'person' : 'people'}`}>
        <DataTable
          columns={[
            {
              header: 'Name',
              key: 'name',
              render: (member) => (
                <span className="grid">
                  <span className="font-semibold">{member.name}</span>
                  <span className="text-xs text-muted-foreground">{member.email}</span>
                </span>
              ),
            },
            { header: 'Role', key: 'role', render: (member) => <span>{roleName(member.role)}</span> },
            {
              header: 'Login',
              key: 'active',
              render: (member) => <StatusBadge kind="tenant" label={member.active ? 'Active' : 'Inactive'} value={member.active ? 'active' : 'archived'} />,
            },
            {
              className: 'text-right',
              header: '',
              key: 'actions',
              render: (member) => (
                <div className="flex justify-end gap-1">
                  {canEdit ? (
                    <Button aria-label={`Edit ${member.name}`} onClick={() => edit(member)} size="icon-sm" type="button" variant="ghost">
                      <Pencil />
                    </Button>
                  ) : null}
                  {canDelete ? (
                    <ConfirmDialog
                      confirmLabel="Remove"
                      description={`${member.name} will no longer be able to sign in to this outlet.`}
                      destructive
                      onConfirm={() => remove(member)}
                      title={`Remove ${member.name}?`}
                      trigger={
                        <Button aria-label={`Remove ${member.name}`} className="text-destructive hover:text-destructive" size="icon-sm" type="button" variant="ghost">
                          <Trash2 />
                        </Button>
                      }
                    />
                  ) : null}
                </div>
              ),
            },
          ]}
          empty={<EmptyState compact description="Add the first team member using the form." icon={Users} title="No staff yet" />}
          loading={resource.status === 'loading'}
          pageSize={10}
          rowKey={(member) => member.id}
          rows={staff}
          searchPlaceholder="Search staff"
          searchText={(member) => `${member.name} ${member.email} ${roleName(member.role)}`}
        />
      </SectionCard>
    </PageShell>
  );
}
