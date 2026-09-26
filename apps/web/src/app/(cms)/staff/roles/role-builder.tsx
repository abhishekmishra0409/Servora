"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { expandPermissions, permissionsForBuiltinRole } from '@restaurent/shared';

import { PageShell } from '../../../../components/page-shell';
import { PermissionMatrix } from '../../../../components/permission-matrix';
import { PlanLimitNotice, UsageStrip } from '../../../../components/plan-limit-notice';
import { useCmsSession } from '../../../../components/cms-session-provider';
import {
  ApiError,
  createCmsRole,
  deleteCmsRole,
  getCmsRoles,
  updateCmsRole,
  type CmsRole,
} from '../../../../lib/api-client';
import { normalize, summarize } from '../../../../lib/permission-matrix';

/** Permissions an editor cannot strip from a role they personally hold. */
const SELF_PROTECTED = ['roles:view', 'roles:edit', 'staff:view'];

const PRESET_ICONS: Record<string, string> = {
  blank: 'add_circle',
  cashier: 'point_of_sale',
  kitchen: 'skillet',
  manager: 'manage_accounts',
  owner: 'verified_user',
  waiter: 'room_service',
};

export function RoleBuilder(): React.ReactElement {
  const session = useCmsSession();
  const [roles, setRoles] = useState<CmsRole[]>([]);
  const [message, setMessage] = useState('Loading roles...');
  const [limitError, setLimitError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState('');
  const [form, setForm] = useState({ description: '', name: '', presetKey: '' });
  const [granted, setGranted] = useState<ReadonlySet<string>>(() => normalize([]));

  const canAdd = session.can('roles:add');
  const canEdit = session.can('roles:edit');
  const canDelete = session.can('roles:delete');

  async function load(): Promise<void> {
    if (!session.token || !session.tenantId) {
      return;
    }

    try {
      const next = await getCmsRoles(session.tenantId, session.token);
      setRoles(next);
      setMessage(next.length === 0 ? 'No roles yet.' : '');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load roles.');
    }
  }

  useEffect(() => {
    void load();
  }, [session.token, session.tenantId]);

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
        icon: PRESET_ICONS[role.key] ?? 'badge',
        key: role.key,
        name: role.builtIn ? role.name : `Copy of ${role.name}`,
        permissions: role.permissions,
        summary: `${role.permissions.length} permissions`,
      })),
      { icon: PRESET_ICONS.blank, key: 'blank', name: 'Start blank', permissions: [], summary: 'Pick everything yourself' },
    ],
    [roles],
  );

  function openCreate(): void {
    setEditingId('');
    setForm({ description: '', name: '', presetKey: '' });
    setGranted(normalize([]));
    setEditorOpen(true);
    setLimitError(null);
    setMessage('');
  }

  function openDuplicate(role: CmsRole): void {
    setEditingId('');
    setForm({ description: role.description ?? '', name: `${role.name} copy`, presetKey: role.key });
    setGranted(normalize(role.permissions));
    setEditorOpen(true);
    setMessage(`Started from ${role.name}. Nothing is saved until you choose Create role.`);
  }

  function openEdit(role: CmsRole): void {
    setEditingId(role.id);
    setForm({ description: role.description ?? '', name: role.name, presetKey: '' });
    setGranted(normalize(role.permissions));
    setEditorOpen(true);
    setMessage('');
  }

  function applyPreset(preset: { key: string; name: string; permissions: string[] }): void {
    setForm((current) => ({ ...current, presetKey: preset.key }));
    setGranted(
      normalize(
        preset.permissions.length > 0
          ? preset.permissions
          : expandPermissions(permissionsForBuiltinRole(preset.key)),
      ),
    );
    setMessage(preset.key === 'blank' ? '' : `Started from ${preset.name}. Change anything you like.`);
  }

  async function save(): Promise<void> {
    setBusy(true);
    setLimitError(null);

    try {
      const permissions = [...granted];

      if (editingId) {
        await updateCmsRole(editingId, { description: form.description, name: form.name.trim(), permissions }, session.token);
        setMessage(`${form.name} saved.`);
      } else {
        await createCmsRole(
          { description: form.description, name: form.name.trim(), permissions, tenantId: session.tenantId },
          session.token,
        );
        setMessage(`${form.name} created.`);
      }

      setEditorOpen(false);
      setEditingId('');
      await load();
      // The editor may have just changed their own access.
      await session.reload();
      await session.refreshEntitlements();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PLAN_LIMIT_REACHED') {
        setLimitError(error);
        setMessage('');
      } else {
        setMessage(error instanceof Error ? error.message : 'Could not save the role.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(role: CmsRole): Promise<void> {
    setBusy(true);

    try {
      await deleteCmsRole(role.id, session.token);
      setConfirmDeleteId('');
      setMessage(`${role.name} deleted.`);
      await load();
      await session.refreshEntitlements();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not delete the role.');
    } finally {
      setBusy(false);
    }
  }

  const review = summarize(granted);
  const customRoleCount = roles.filter((role) => !role.builtIn).length;
  const customRoleCap = session.entitlements?.limits.customRoles ?? 0;

  return (
    <PageShell
      description="Create roles that match how your restaurant actually works, then choose exactly what each one can see and change."
      eyebrow="Roles &amp; Access"
      title="Build roles for your team"
      toolbar={
        canAdd && !editorOpen ? (
          <button onClick={openCreate} type="button">
            <span aria-hidden="true" className="material-symbols-outlined">add</span>
            New role
          </button>
        ) : null
      }
    >
      {message ? <p className="notice-text">{message}</p> : null}
      <PlanLimitNotice error={limitError} resource="roles" />

      <UsageStrip cap={customRoleCap} label="Custom roles" used={customRoleCount} />

      {editorOpen ? (
        <section className="panel role-editor">
          <div className="role-step">
            <div className="role-step__head">
              <span className="role-step__num">1</span>
              <h3>Name this role</h3>
            </div>
            <div className="cms-form-grid cms-form-grid--two">
              <label>
                <span>Role name</span>
                <input
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="e.g. Floor Lead"
                  value={form.name}
                />
              </label>
              <label>
                <span>Description (optional)</span>
                <input
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  placeholder="What does this person do?"
                  value={form.description}
                />
              </label>
            </div>

            {editingId ? null : (
              <>
                <p className="muted">Start from a ready-made role, then change anything you like.</p>
                <div className="role-preset-grid">
                  {presets.map((preset) => (
                    <button
                      className={`role-preset${form.presetKey === preset.key ? ' role-preset--active' : ''}`}
                      key={preset.key}
                      onClick={() => applyPreset(preset)}
                      type="button"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined">{preset.icon}</span>
                      <strong>{preset.name}</strong>
                      <small>{preset.summary}</small>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="role-step">
            <div className="role-step__head">
              <span className="role-step__num">2</span>
              <h3>Choose what they can do</h3>
            </div>

            {form.name.trim() ? (
              <>
                {editingOwnRole ? (
                  <p className="notice-text">
                    You are assigned this role, so Roles and Staff access stay switched on — otherwise
                    saving would lock you out of this screen.
                  </p>
                ) : null}
                <div className="role-matrix-toolbar">
                  <span className="cms-status">
                    {granted.size} permissions across {review.canSee.length} screens
                  </span>
                  <button className="button-quiet" onClick={() => setGranted(normalize([]))} type="button">
                    Clear all
                  </button>
                </div>
                <PermissionMatrix granted={granted} locked={lockedPermissions} onChange={setGranted} />
              </>
            ) : (
              <p className="muted">Give the role a name first.</p>
            )}
          </div>

          <div className="role-step">
            <div className="role-step__head">
              <span className="role-step__num">3</span>
              <h3>Review and save</h3>
            </div>
            <ul className="role-summary">
              <li>
                <span aria-hidden="true" className="material-symbols-outlined">visibility</span>
                Can open {review.canSee.length} screens: {review.canSee.join(', ') || 'nothing'}
              </li>
              <li>
                <span aria-hidden="true" className="material-symbols-outlined">add_circle</span>
                Can add in: {review.canCreate.join(', ') || 'nothing'}
              </li>
              <li>
                <span aria-hidden="true" className="material-symbols-outlined">edit</span>
                Can change in: {review.canEdit.join(', ') || 'nothing'}
              </li>
              <li>
                <span aria-hidden="true" className="material-symbols-outlined">delete</span>
                Can delete in: {review.canDelete.join(', ') || 'nothing'}
              </li>
              <li>
                <span aria-hidden="true" className="material-symbols-outlined">block</span>
                Cannot see: {review.hidden.join(', ') || 'nothing'}
              </li>
            </ul>
            <div className="action-row">
              <button disabled={busy || !form.name.trim()} onClick={() => void save()} type="button">
                {editingId ? 'Save role' : 'Create role'}
              </button>
              <button className="button-secondary" onClick={() => setEditorOpen(false)} type="button">
                Cancel
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="panel">
        <div className="cms-section-head">
          <h2>Roles</h2>
          <Link className="button-quiet" href="/staff">Assign people to roles &rarr;</Link>
        </div>
        <div className="cms-data-table">
          {roles.map((role) => (
            <div className="cms-data-row roles-row" key={role.id}>
              <div>
                <strong>{role.name}</strong>
                <small className="muted">{role.description ?? ''}</small>
              </div>
              <span className="pill">{role.builtIn ? 'Built-in' : 'Custom'}</span>
              <span>{role.permissions.length} permissions</span>
              <span>{role.assignedCount} {role.assignedCount === 1 ? 'person' : 'people'}</span>
              <div className="action-row">
                {role.builtIn ? (
                  canAdd ? (
                    <button className="button-secondary" onClick={() => openDuplicate(role)} type="button">
                      Duplicate
                    </button>
                  ) : null
                ) : (
                  <>
                    {canEdit ? (
                      <button className="button-secondary" onClick={() => openEdit(role)} type="button">
                        Edit
                      </button>
                    ) : null}
                    {canDelete ? (
                      confirmDeleteId === role.id ? (
                        <>
                          <button className="danger-button" disabled={busy} onClick={() => void remove(role)} type="button">
                            Confirm delete
                          </button>
                          <button className="button-quiet" onClick={() => setConfirmDeleteId('')} type="button">
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          className="danger-button"
                          disabled={role.assignedCount > 0}
                          onClick={() => setConfirmDeleteId(role.id)}
                          title={role.assignedCount > 0 ? 'Move these people to another role first' : undefined}
                          type="button"
                        >
                          Delete
                        </button>
                      )
                    ) : null}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
