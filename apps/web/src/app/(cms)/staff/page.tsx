'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { PageShell } from '../../../components/page-shell';
import { PlanLimitNotice, UsageStrip } from '../../../components/plan-limit-notice';
import { useCmsSession } from '../../../components/cms-session-provider';
import {
  ApiError,
  createCmsStaff,
  deleteCmsStaff,
  getCmsRoles,
  getCmsStaff,
  updateCmsStaff,
  type CmsRole,
  type CmsStaffMember,
} from '../../../lib/api-client';

export default function StaffPage() {
  const session = useCmsSession();
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState({ active: true, email: '', name: '', password: '', role: 'waiter' });
  const [staff, setStaff] = useState<CmsStaffMember[]>([]);
  const [roles, setRoles] = useState<CmsRole[]>([]);
  const [message, setMessage] = useState('Sign in to load staff from the database.');
  const [limitError, setLimitError] = useState<ApiError | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState('');

  const branchId = session.branchId;
  const tenantId = session.tenantId;
  const token = session.token;

  const canAdd = session.can('staff:add');
  const canEdit = session.can('staff:edit');
  const canDelete = session.can('staff:delete');
  const canManageRoles = session.can('roles:view');

  async function load(): Promise<void> {
    if (!branchId || !token) {
      setMessage('Sign in to manage staff.');
      return;
    }

    try {
      const members = await getCmsStaff(branchId, token);
      setStaff(members);
      setMessage(members.length ? '' : 'No staff memberships found.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load staff.');
    }

    // The role picker must offer this tenant's custom roles, not a hardcoded
    // list. A user without roles:view simply keeps the built-in names.
    if (canManageRoles && tenantId) {
      try {
        setRoles(await getCmsRoles(tenantId, token));
      } catch {
        setRoles([]);
      }
    }
  }

  useEffect(() => {
    void load();
  }, [branchId, token, tenantId, canManageRoles]);

  function resetForm(): void {
    setEditingId('');
    setForm({ active: true, email: '', name: '', password: '', role: 'waiter' });
    setLimitError(null);
  }

  function edit(member: CmsStaffMember): void {
    setEditingId(member.id);
    setForm({ active: member.active, email: member.email, name: member.name, password: '', role: member.role });
  }

  async function submit(): Promise<void> {
    if (!tenantId || !branchId || !token || !form.name.trim()) {
      setMessage('Tenant, branch, login token, and staff name are required.');
      return;
    }

    setLimitError(null);

    try {
      if (editingId) {
        await updateCmsStaff(editingId, { active: form.active, name: form.name.trim(), role: form.role }, token);
      } else {
        if (!form.email.trim() || !form.password) {
          setMessage('Email and password are required for new staff.');
          return;
        }
        await createCmsStaff(
          {
            branchId,
            email: form.email.trim(),
            name: form.name.trim(),
            password: form.password,
            role: form.role,
            tenantId,
          },
          token,
        );
      }

      resetForm();
      await load();
      await session.refreshEntitlements();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PLAN_LIMIT_REACHED') {
        setLimitError(error);
        setMessage('');
      } else {
        setMessage(error instanceof Error ? error.message : 'Could not save staff member.');
      }
    }
  }

  async function remove(member: CmsStaffMember): Promise<void> {
    if (!token) return;

    try {
      await deleteCmsStaff(member.id, token);
      setConfirmRemoveId('');
      await load();
      await session.refreshEntitlements();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not remove staff member.');
    }
  }

  const roleOptions = roles.length > 0 ? roles : [];
  const builtInRoles = roleOptions.filter((role) => role.builtIn);
  const customRoles = roleOptions.filter((role) => !role.builtIn);
  const staffCap = session.entitlements?.limits.employees ?? 0;
  const staffUsed = session.entitlements?.usage.employees ?? staff.length;
  const atCap = staffCap > 0 && staffUsed >= staffCap;

  return (
    <PageShell
      description="Map permissions to branch reality for waiters, kitchen staff, cashiers, and owner-level access."
      eyebrow="Staff"
      title="Roles, assignments, and shift visibility"
      toolbar={
        canManageRoles ? (
          <Link className="button-secondary" href="/staff/roles">
            <span aria-hidden="true" className="material-symbols-outlined">admin_panel_settings</span>
            Manage roles
          </Link>
        ) : null
      }
    >
      {message ? <p className="notice-text">{message}</p> : null}
      <PlanLimitNotice error={limitError} resource="staff accounts" />

      <UsageStrip cap={staffCap} label="Staff accounts" used={staffUsed} />

      <section className="cms-settings-grid">
        {canAdd || canEdit ? (
          <article className="panel">
            <div className="cms-section-head">
              <h2>{editingId ? 'Update staff' : 'Add staff'}</h2>
              {editingId ? (
                <button className="button-secondary" onClick={resetForm} type="button">Cancel</button>
              ) : null}
            </div>
            <div className="form-stack">
              <label>
                Name
                <input onChange={(event) => setForm({ ...form, name: event.target.value })} value={form.name} />
              </label>
              <label>
                Email
                <input
                  disabled={Boolean(editingId)}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  value={form.email}
                />
              </label>
              {!editingId ? (
                <label>
                  Password
                  <input
                    onChange={(event) => setForm({ ...form, password: event.target.value })}
                    type="password"
                    value={form.password}
                  />
                </label>
              ) : null}
              <label>
                Role
                <select onChange={(event) => setForm({ ...form, role: event.target.value })} value={form.role}>
                  {roleOptions.length === 0 ? (
                    <option value={form.role}>{form.role}</option>
                  ) : (
                    <>
                      <optgroup label="Built-in">
                        {builtInRoles.map((role) => (
                          <option key={role.key} value={role.key}>{role.name}</option>
                        ))}
                      </optgroup>
                      {customRoles.length > 0 ? (
                        <optgroup label="Custom roles">
                          {customRoles.map((role) => (
                            <option key={role.key} value={role.key}>{role.name}</option>
                          ))}
                        </optgroup>
                      ) : null}
                    </>
                  )}
                </select>
              </label>
              <label className="checkbox-row">
                <input
                  checked={form.active}
                  onChange={(event) => setForm({ ...form, active: event.target.checked })}
                  type="checkbox"
                />
                Active login
              </label>
              <button
                disabled={!editingId && atCap}
                onClick={() => void submit()}
                title={!editingId && atCap ? 'Your plan’s staff limit is reached' : undefined}
                type="button"
              >
                {editingId ? 'Update staff' : 'Create staff'}
              </button>
            </div>
          </article>
        ) : null}
        <article className="panel">
          <div className="cms-section-head"><h2>How access works</h2></div>
          <p className="muted">
            Each person gets one role per outlet, and the role decides which screens they see and what
            they can change there. Build a role that matches your restaurant on the roles screen, then
            pick it here.
          </p>
          {canManageRoles ? (
            <Link className="button-quiet" href="/staff/roles">Build or edit roles &rarr;</Link>
          ) : null}
        </article>
      </section>

      <section className="panel">
        <div className="cms-section-head"><h2>Staff grid</h2></div>
        <div className="cms-data-table">
          {staff.map((member) => (
            <div className="cms-data-row" key={member.id}>
              <strong>{member.name}</strong>
              <span>{roleOptions.find((role) => role.key === member.role)?.name ?? member.role.replaceAll('_', ' ')}</span>
              <span>{member.email}</span>
              <span>{member.active ? 'Active' : 'Inactive'}</span>
              <span className="cms-status">{member.active ? 'Enabled' : 'Disabled'}</span>
              <div className="action-row">
                {canEdit ? (
                  <button className="button-secondary" onClick={() => edit(member)} type="button">Edit</button>
                ) : null}
                {canDelete ? (
                  confirmRemoveId === member.id ? (
                    <>
                      <button className="danger-button" onClick={() => void remove(member)} type="button">
                        Confirm
                      </button>
                      <button className="button-quiet" onClick={() => setConfirmRemoveId('')} type="button">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button className="danger-button" onClick={() => setConfirmRemoveId(member.id)} type="button">
                      Remove
                    </button>
                  )
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
