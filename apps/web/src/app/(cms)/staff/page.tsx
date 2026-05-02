'use client';

import { useEffect, useState } from 'react';

import { PageShell } from '../../../components/page-shell';
import {
  createCmsStaff,
  deleteCmsStaff,
  getCmsStaff,
  updateCmsStaff,
  type CmsStaffMember,
} from '../../../lib/api-client';
import { readCmsSettings } from '../../../lib/cms-storage';

const roles = ['owner', 'manager', 'waiter', 'kitchen', 'cashier'];

export default function StaffPage() {
  const [branchId, setBranchId] = useState('');
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState({ active: true, email: '', name: '', password: '', role: 'waiter' });
  const [staff, setStaff] = useState<CmsStaffMember[]>([]);
  const [message, setMessage] = useState('Sign in to load staff from the database.');
  const [tenantId, setTenantId] = useState('');
  const [token, setToken] = useState('');

  async function load(nextBranchId = branchId, nextToken = token): Promise<void> {
    if (!nextBranchId || !nextToken) {
      setMessage('Sign in to manage staff.');
      return;
    }
    try {
      const members = await getCmsStaff(nextBranchId, nextToken);
      setStaff(members);
      setMessage(members.length ? '' : 'No staff memberships found.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load staff.');
    }
  }

  useEffect(() => {
    const settings = readCmsSettings();
    setBranchId(settings.branchId);
    setTenantId(settings.tenantId);
    setToken(settings.token);
    void load(settings.branchId, settings.token);
  }, []);

  function resetForm(): void {
    setEditingId('');
    setForm({ active: true, email: '', name: '', password: '', role: 'waiter' });
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
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save staff member.');
    }
  }

  async function remove(member: CmsStaffMember): Promise<void> {
    if (!token) return;
    try {
      await deleteCmsStaff(member.id, token);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not remove staff member.');
    }
  }

  return (
    <PageShell eyebrow="Staff" title="Roles, assignments, and shift visibility" description="Map permissions to branch reality for waiters, kitchen staff, cashiers, and owner-level access.">
      {message ? <p className="notice-text">{message}</p> : null}
      <section className="cms-settings-grid">
        <article className="panel">
          <div className="cms-section-head">
            <h2>{editingId ? 'Update staff' : 'Add staff'}</h2>
            {editingId ? <button className="button-secondary" onClick={resetForm} type="button">Cancel</button> : null}
          </div>
          <div className="form-stack">
            <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label>Email<input disabled={Boolean(editingId)} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            {!editingId ? <label>Password<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label> : null}
            <label>Role<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
            <label className="checkbox-row"><input checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} type="checkbox" /> Active login</label>
            <button onClick={() => void submit()} type="button">{editingId ? 'Update staff' : 'Create staff'}</button>
          </div>
        </article>
        <article className="panel">
          <div className="cms-section-head"><h2>Owner access</h2></div>
          <p className="muted">Use owner and manager roles for restaurant control. Waiter, kitchen, and cashier accounts stay focused on their app workflows.</p>
        </article>
      </section>
      <section className="panel">
        <div className="cms-section-head"><h2>Staff grid</h2></div>
        <div className="cms-data-table">
          {staff.map((member) => (
            <div className="cms-data-row" key={member.id}>
              <strong>{member.name}</strong>
              <span>{member.role.replaceAll('_', ' ')}</span>
              <span>{member.email}</span>
              <span>{member.active ? 'Active' : 'Inactive'}</span>
              <span className="cms-status">{member.active ? 'Enabled' : 'Disabled'}</span>
              <div className="action-row">
                <button className="button-secondary" onClick={() => edit(member)} type="button">Edit</button>
                <button className="danger-button" onClick={() => void remove(member)} type="button">Remove</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
