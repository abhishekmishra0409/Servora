'use client';

import { expandPermissions, permissionsForBuiltinRole } from '@restaurent/shared';
import {
  ArrowRight,
  Ban,
  BadgeCheck,
  ChefHat,
  CirclePlus,
  Copy,
  Eye,
  HandPlatter,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  UserCog,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { useCmsSession } from '@/components/cms-session-provider';
import { ConfirmDialog, useConfirm } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table';
import { EmptyState } from '@/components/empty-state';
import { NoticeBanner } from '@/components/error-state';
import { FormActions, FormField, FormGrid } from '@/components/form-field';
import { PageShell } from '@/components/page-shell';
import { PermissionMatrix } from '@/components/permission-matrix';
import { PlanLimitNotice, UsageStrip } from '@/components/plan-limit-notice';
import { SectionCard } from '@/components/section-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError, createCmsRole, deleteCmsRole, getCmsRoles, updateCmsRole, type CmsRole } from '@/lib/api-client';
import { errorMessage } from '@/lib/async-state';
import { normalize, summarize } from '@/lib/permission-matrix';
import { cn } from '@/lib/utils';
import { useCmsResource } from '@/lib/use-cms-resource';

/** Permissions an editor cannot strip from a role they personally hold. */
const SELF_PROTECTED = ['roles:view', 'roles:edit', 'staff:view'];

const PRESET_ICONS: Record<string, LucideIcon> = {
  blank: CirclePlus,
  cashier: Wallet,
  kitchen: ChefHat,
  manager: UserCog,
  owner: BadgeCheck,
  waiter: HandPlatter,
};

function StepHeading({ number, title }: { number: number; title: string }): ReactNode {
  return (
    <div className="flex items-center gap-2.5">
      <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
        {number}
      </span>
      <h3 className="text-base font-semibold">{title}</h3>
    </div>
  );
}

export function RoleBuilder(): ReactNode {
  const session = useCmsSession();
  const confirm = useConfirm();
  const resource = useCmsResource<CmsRole[]>(({ tenantId, token }) => getCmsRoles(tenantId, token), {
    initial: [],
    scope: 'tenant',
  });
  const roles = resource.data;
  const [limitError, setLimitError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState({ description: '', name: '', presetKey: '' });
  const [granted, setGranted] = useState<ReadonlySet<string>>(() => normalize([]));

  const canAdd = session.can('roles:add');
  const canEdit = session.can('roles:edit');
  const canDelete = session.can('roles:delete');

  /** Roles the editor currently holds — their own access must survive a save. */
  const ownRoleKeys = useMemo(
    () => new Set(session.branches.map((branch) => branch.roleKey).concat(session.role)),
    [session.branches, session.role],
  );

  const editingRole = roles.find((role) => role.id === editingId);
  const editingOwnRole = Boolean(editingRole && ownRoleKeys.has(editingRole.key));
  const lockedPermissions = useMemo(
    () => (editingOwnRole ? new Set(SELF_PROTECTED) : new Set<string>()),
    [editingOwnRole],
  );

  const presets = useMemo(
    () => [
      ...roles.map((role) => ({
        icon: PRESET_ICONS[role.key] ?? ShieldCheck,
        key: role.key,
        name: role.builtIn ? role.name : `Copy of ${role.name}`,
        permissions: role.permissions,
        summary: `${role.permissions.length} permissions`,
      })),
      { icon: PRESET_ICONS.blank!, key: 'blank', name: 'Start blank', permissions: [], summary: 'Pick everything yourself' },
    ],
    [roles],
  );

  function openCreate(): void {
    setEditingId('');
    setForm({ description: '', name: '', presetKey: '' });
    setGranted(normalize([]));
    setEditorOpen(true);
    setLimitError(null);
  }

  function openDuplicate(role: CmsRole): void {
    setEditingId('');
    setForm({ description: role.description ?? '', name: `${role.name} copy`, presetKey: role.key });
    setGranted(normalize(role.permissions));
    setEditorOpen(true);
    toast.info(`Started from ${role.name}. Nothing is saved until you choose Create role.`);
    window.scrollTo({ behavior: 'smooth', top: 0 });
  }

  function openEdit(role: CmsRole): void {
    setEditingId(role.id);
    setForm({ description: role.description ?? '', name: role.name, presetKey: '' });
    setGranted(normalize(role.permissions));
    setEditorOpen(true);
    window.scrollTo({ behavior: 'smooth', top: 0 });
  }

  function applyPreset(preset: { key: string; name: string; permissions: string[] }): void {
    setForm((current) => ({ ...current, presetKey: preset.key }));
    setGranted(
      normalize(
        preset.permissions.length > 0 ? preset.permissions : expandPermissions(permissionsForBuiltinRole(preset.key)),
      ),
    );
  }

  async function save(): Promise<void> {
    setBusy(true);
    setLimitError(null);

    try {
      const permissions = [...granted];

      if (editingId) {
        await updateCmsRole(editingId, { description: form.description, name: form.name.trim(), permissions }, session.token);
        toast.success(`${form.name} saved`);
      } else {
        await createCmsRole(
          { description: form.description, name: form.name.trim(), permissions, tenantId: session.tenantId },
          session.token,
        );
        toast.success(`${form.name} created`);
      }

      setEditorOpen(false);
      setEditingId('');
      await resource.reload();
      // The editor may have just changed their own access.
      await session.reload();
      await session.refreshEntitlements();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PLAN_LIMIT_REACHED') {
        setLimitError(error);
      } else {
        toast.error(errorMessage(error, 'Could not save the role.'));
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(role: CmsRole): Promise<void> {
    setBusy(true);
    try {
      await deleteCmsRole(role.id, session.token);
      toast.success(`${role.name} deleted`);
      await resource.reload();
      await session.refreshEntitlements();
    } catch (error) {
      toast.error(errorMessage(error, 'Could not delete the role.'));
      throw error;
    } finally {
      setBusy(false);
    }
  }

  const review = summarize(granted);
  const customRoleCount = roles.filter((role) => !role.builtIn).length;
  const customRoleCap = session.entitlements?.limits.customRoles ?? 0;

  const reviewRows: { icon: LucideIcon; label: string; values: string[] }[] = [
    { icon: Eye, label: `Can open ${review.canSee.length} screens`, values: review.canSee },
    { icon: CirclePlus, label: 'Can add in', values: review.canCreate },
    { icon: Pencil, label: 'Can change in', values: review.canEdit },
    { icon: Trash2, label: 'Can delete in', values: review.canDelete },
    { icon: Ban, label: 'Cannot see', values: review.hidden },
  ];

  return (
    <PageShell
      resource={resource}
      what="roles"
      actions={
        canAdd && !editorOpen ? (
          <Button onClick={openCreate} type="button">
            <Plus />
            New role
          </Button>
        ) : undefined
      }
      description="Create roles that match how your restaurant actually works, then choose exactly what each one can see and change."
      eyebrow="Roles and access"
      title="Roles"
    >
      <PlanLimitNotice error={limitError} resource="roles" />
      <UsageStrip cap={customRoleCap} label="Custom roles" used={customRoleCount} />

      {editorOpen ? (
        <SectionCard
          actions={
            <Button onClick={() => setEditorOpen(false)} size="sm" type="button" variant="ghost">
              Cancel
            </Button>
          }
          contentClassName="space-y-6"
          title={editingId ? `Edit ${editingRole?.name ?? 'role'}` : 'New role'}
        >
          <div className="space-y-4">
            <StepHeading number={1} title="Name this role" />
            <FormGrid>
              <FormField htmlFor="role-name" label="Role name" required>
                <Input id="role-name" onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Floor Lead" value={form.name} />
              </FormField>
              <FormField htmlFor="role-description" label="Description">
                <Input
                  id="role-description"
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  placeholder="What does this person do?"
                  value={form.description}
                />
              </FormField>
            </FormGrid>

            {editingId ? null : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Start from a ready-made role, then change anything you like.</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {presets.map((preset) => {
                    const Icon = preset.icon;
                    const active = form.presetKey === preset.key;
                    return (
                      <button
                        aria-pressed={active}
                        className={cn(
                          'grid justify-items-start gap-1 rounded-lg border bg-card p-3 text-left transition-colors',
                          'hover:border-primary/50 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                          active && 'border-primary bg-accent/60 ring-2 ring-primary/20',
                        )}
                        key={preset.key}
                        onClick={() => applyPreset(preset)}
                        type="button"
                      >
                        <Icon aria-hidden="true" className={cn('size-5', active ? 'text-primary' : 'text-muted-foreground')} />
                        <span className="text-sm font-semibold">{preset.name}</span>
                        <span className="text-xs text-muted-foreground">{preset.summary}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4 border-t pt-6">
            <StepHeading number={2} title="Choose what they can do" />
            {form.name.trim() ? (
              <>
                {editingOwnRole ? (
                  <NoticeBanner tone="info">
                    You are assigned this role, so Roles and Staff access stay switched on. Otherwise saving would lock you
                    out of this screen.
                  </NoticeBanner>
                ) : null}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge variant="secondary">
                    {granted.size} permissions across {review.canSee.length} screens
                  </Badge>
                  <Button
                    disabled={granted.size === 0}
                    onClick={() =>
                      void confirm({
                        confirmLabel: 'Clear all',
                        description: `All ${granted.size} permissions picked for this role will be switched off. Nothing is saved until you choose ${editingId ? 'Save role' : 'Create role'}.`,
                        title: 'Clear every permission?',
                        tone: 'warning',
                      }).then((ok) => {
                        if (ok) setGranted(normalize([]));
                      })
                    }
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    Clear all
                  </Button>
                </div>
                <PermissionMatrix granted={granted} locked={lockedPermissions} onChange={setGranted} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Give the role a name first.</p>
            )}
          </div>

          <div className="space-y-4 border-t pt-6">
            <StepHeading number={3} title="Review and save" />
            <ul className="grid gap-2 text-sm">
              {reviewRows.map(({ icon: Icon, label, values }) => (
                <li className="flex items-start gap-2" key={label}>
                  <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>
                    <span className="font-medium">{label}:</span>{' '}
                    <span className="text-muted-foreground">{values.join(', ') || 'nothing'}</span>
                  </span>
                </li>
              ))}
            </ul>
            <FormActions>
              <Button disabled={busy || !form.name.trim()} onClick={() => void save()} type="button">
                {editingId ? 'Save role' : 'Create role'}
              </Button>
              <Button onClick={() => setEditorOpen(false)} type="button" variant="outline">
                Cancel
              </Button>
            </FormActions>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard
        actions={
          <Button asChild size="sm" variant="ghost">
            <Link href="/staff">
              Assign people to roles
              <ArrowRight />
            </Link>
          </Button>
        }
        contentClassName="space-y-0"
        title={resource.status === 'loading' ? 'Roles' : `${roles.length} roles`}
      >
        <DataTable
          columns={[
            {
              header: 'Role',
              key: 'name',
              render: (role) => (
                <span className="grid">
                  <span className="font-semibold">{role.name}</span>
                  {role.description ? <span className="text-xs text-muted-foreground">{role.description}</span> : null}
                </span>
              ),
            },
            {
              header: 'Type',
              key: 'type',
              render: (role) => <Badge variant={role.builtIn ? 'secondary' : 'info'}>{role.builtIn ? 'Built-in' : 'Custom'}</Badge>,
            },
            { header: 'Permissions', key: 'perms', render: (role) => <span className="tabular-nums">{role.permissions.length}</span> },
            {
              header: 'People',
              key: 'people',
              render: (role) => (
                <span className="tabular-nums">
                  {role.assignedCount} {role.assignedCount === 1 ? 'person' : 'people'}
                </span>
              ),
            },
            {
              className: 'text-right',
              header: '',
              key: 'actions',
              render: (role) => (
                <div className="flex justify-end gap-1">
                  {role.builtIn ? (
                    canAdd ? (
                      <Button onClick={() => openDuplicate(role)} size="sm" type="button" variant="outline">
                        <Copy />
                        Duplicate
                      </Button>
                    ) : null
                  ) : (
                    <>
                      {canEdit ? (
                        <Button aria-label={`Edit ${role.name}`} onClick={() => openEdit(role)} size="icon-sm" type="button" variant="ghost">
                          <Pencil />
                        </Button>
                      ) : null}
                      {canDelete ? (
                        <ConfirmDialog
                          confirmLabel="Delete role"
                          description="Nobody is assigned to this role, so it can be removed safely."
                          details={['Its permission set is deleted permanently.', 'Built-in roles are not affected.']}
                          destructive
                          onConfirm={() => remove(role)}
                          title={`Delete ${role.name}?`}
                          trigger={
                            <Button
                              aria-label={`Delete ${role.name}`}
                              className="text-destructive hover:text-destructive"
                              disabled={busy || role.assignedCount > 0}
                              size="icon-sm"
                              title={role.assignedCount > 0 ? 'Move these people to another role first' : undefined}
                              type="button"
                              variant="ghost"
                            >
                              <Trash2 />
                            </Button>
                          }
                        />
                      ) : null}
                    </>
                  )}
                </div>
              ),
            },
          ]}
          empty={<EmptyState compact icon={ShieldCheck} title="No roles yet" />}
          loading={resource.status === 'loading'}
          rowKey={(role) => role.id}
          rows={roles}
          searchPlaceholder="Search roles"
          searchText={(role) => `${role.name} ${role.description ?? ''}`}
        />
      </SectionCard>
    </PageShell>
  );
}
