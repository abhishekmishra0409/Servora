'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

import { PageShell } from '../../../components/page-shell';
import {
  createCmsTable,
  deleteCmsTable,
  documentId,
  getCmsBranches,
  getCmsTables,
  getCmsTenants,
  regenerateCmsQr,
  updateCmsTable,
  type CmsBranch,
  type CmsTable,
  type CmsTenant,
} from '../../../lib/api-client';
import { readCmsSettings } from '../../../lib/cms-storage';

const configuredCustomerOrigin = process.env.NEXT_PUBLIC_CUSTOMER_ORIGIN || '';
const configuredRouterIp = process.env.NEXT_PUBLIC_ROUTER_IP || '';

function initialCustomerOrigin(): string {
  if (configuredCustomerOrigin) return configuredCustomerOrigin;
  if (typeof window === 'undefined') return configuredRouterIp ? `http://${configuredRouterIp}:3000` : 'http://localhost:3000';
  const origin = window.location.origin;
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname) && configuredRouterIp
    ? `http://${configuredRouterIp}:3000`
    : origin;
}

export default function TablesPage() {
  const [branch, setBranch] = useState<CmsBranch | null>(null);
  const [branchId, setBranchId] = useState('');
  const [customerOrigin, setCustomerOrigin] = useState(initialCustomerOrigin);
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState({ capacity: '4', floorId: '', tableNo: '' });
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [tables, setTables] = useState<CmsTable[]>([]);
  const [message, setMessage] = useState('Sign in to load tables from the database.');
  const [tenant, setTenant] = useState<CmsTenant | null>(null);
  const [tenantId, setTenantId] = useState('');
  const [token, setToken] = useState('');

  function customerUrl(qrToken?: string | null): string {
    if (!qrToken || !tenant || !branch) return '';
    return `${customerOrigin.replace(/\/$/, '')}/r/${tenant.slug}/${branch.slug}/t/${qrToken}`;
  }

  async function renderQrImages(
    nextTables: CmsTable[],
    nextTenant = tenant,
    nextBranch = branch,
    nextOrigin = customerOrigin,
  ): Promise<void> {
    if (!nextTenant || !nextBranch) {
      setQrImages({});
      return;
    }

    const images = await Promise.all(
      nextTables.map(async (table) => {
        const qrToken = table.qrToken ?? '';
        const url = qrToken ? `${nextOrigin.replace(/\/$/, '')}/r/${nextTenant.slug}/${nextBranch.slug}/t/${qrToken}` : '';
        const dataUrl = url
          ? await QRCode.toDataURL(url, {
              color: { dark: '#111c2d', light: '#ffffff' },
              errorCorrectionLevel: 'M',
              margin: 2,
              width: 220,
            })
          : '';
        return [documentId(table), dataUrl] as const;
      }),
    );
    setQrImages(Object.fromEntries(images));
  }

  async function load(
    nextTenantId = tenantId,
    nextBranchId = branchId,
    nextToken = token,
    nextOrigin = customerOrigin,
  ): Promise<void> {
    if (!nextTenantId || !nextBranchId || !nextToken) {
      setMessage('Sign in to manage tables.');
      return;
    }
    try {
      const [nextTenants, nextBranches, nextTables] = await Promise.all([
        getCmsTenants(nextToken),
        getCmsBranches(nextTenantId, nextToken),
        getCmsTables(nextBranchId, nextToken),
      ]);
      const nextTenant = nextTenants.find((item) => documentId(item) === nextTenantId) ?? nextTenants[0] ?? null;
      const nextBranch = nextBranches.find((item) => documentId(item) === nextBranchId) ?? nextBranches[0] ?? null;
      setTenant(nextTenant);
      setBranch(nextBranch);
      setTables(nextTables);
      await renderQrImages(nextTables, nextTenant, nextBranch, nextOrigin);
      const defaultFloorId = nextTables.find((table) => table.floorId)?.floorId ?? '';
      setForm((current) => ({ ...current, floorId: current.floorId || defaultFloorId }));
      setMessage(nextTables.length ? '' : 'No tables found for this branch.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load tables.');
    }
  }

  useEffect(() => {
    const settings = readCmsSettings();
    const origin = initialCustomerOrigin();
    setBranchId(settings.branchId);
    setCustomerOrigin(origin);
    setTenantId(settings.tenantId);
    setToken(settings.token);
    void load(settings.tenantId, settings.branchId, settings.token, origin);
  }, []);

  useEffect(() => {
    void renderQrImages(tables);
  }, [customerOrigin, tenant, branch]);

  function resetForm(): void {
    setEditingId('');
    setForm({ capacity: '4', floorId: tables.find((table) => table.floorId)?.floorId ?? '', tableNo: '' });
  }

  function edit(table: CmsTable): void {
    setEditingId(documentId(table));
    setForm({ capacity: String(table.capacity), floorId: table.floorId ?? '', tableNo: table.tableNo });
  }

  async function submit(): Promise<void> {
    if (!tenantId || !branchId || !token || !form.floorId || !form.tableNo.trim()) {
      setMessage('Tenant, branch, floor, table number, and login token are required.');
      return;
    }
    try {
      if (editingId) {
        await updateCmsTable(editingId, { capacity: Number(form.capacity), floorId: form.floorId, tableNo: form.tableNo }, token);
      } else {
        await createCmsTable(
          { branchId, capacity: Number(form.capacity), floorId: form.floorId, tableNo: form.tableNo.trim(), tenantId },
          token,
        );
      }
      resetForm();
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save table.');
    }
  }

  async function remove(table: CmsTable): Promise<void> {
    if (!token) return;
    try {
      await deleteCmsTable(documentId(table), token);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not delete table.');
    }
  }

  async function regenerate(table: CmsTable): Promise<void> {
    if (!token) return;
    try {
      await regenerateCmsQr(documentId(table), token);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not regenerate QR.');
    }
  }

  return (
    <PageShell eyebrow="Tables" title="Table and floor operations" description="Color-coded table status, active session snapshots, waiter attention, and bill actions mapped to real branch flow.">
      {message ? <p className="notice-text">{message}</p> : null}
      <section className="cms-settings-grid">
        <article className="panel">
          <div className="cms-section-head">
            <h2>{editingId ? 'Update table' : 'Add table'}</h2>
            {editingId ? <button className="button-secondary" onClick={resetForm} type="button">Cancel</button> : null}
          </div>
          <div className="form-stack">
            <label>Table number<input value={form.tableNo} onChange={(event) => setForm({ ...form, tableNo: event.target.value })} /></label>
            <label>Capacity<input min="1" type="number" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} /></label>
            <label>Floor ID<input value={form.floorId} onChange={(event) => setForm({ ...form, floorId: event.target.value })} /></label>
            <button onClick={() => void submit()} type="button">{editingId ? 'Update table' : 'Create table'}</button>
          </div>
        </article>
        <article className="panel">
          <div className="cms-section-head"><h2>QR lifecycle</h2></div>
          <div className="form-stack">
            <label>
              Customer app origin
              <input value={customerOrigin} onChange={(event) => setCustomerOrigin(event.target.value)} />
            </label>
            <p className="muted">Every table keeps its own QR token. Regenerate it when a printed code is compromised or a table is reissued.</p>
          </div>
        </article>
      </section>
      <section className="cms-table-grid">
        {tables.map((table) => {
          const tableId = documentId(table);
          const url = customerUrl(table.qrToken);

          return (
          <article className="cms-table-card" key={tableId}>
            <div className="cms-table-card__head">
              <div>
                <h2>Table {table.tableNo}</h2>
                <p className="muted">{table.capacity} seats</p>
              </div>
              <span className="cms-status">{table.status.replaceAll('_', ' ')}</span>
            </div>
            <div className="cms-qr-preview" aria-label={`QR preview for table ${table.tableNo}`}>
              {qrImages[tableId] ? (
                <img alt={`Customer QR code for table ${table.tableNo}`} src={qrImages[tableId]} />
              ) : (
                <span className="material-symbols-outlined" aria-hidden="true">qr_code_2</span>
              )}
            </div>
            <div className="cms-qr-link">
              <strong>{table.qrToken ?? 'No QR token'}</strong>
              {url ? <a href={url} target="_blank" rel="noreferrer">{url}</a> : null}
            </div>
            <div className="action-row">
              <button className="button-secondary" onClick={() => edit(table)} type="button">Edit</button>
              <button className="button-secondary" onClick={() => void regenerate(table)} type="button">Regenerate QR</button>
              <button className="danger-button" onClick={() => void remove(table)} type="button">Delete</button>
            </div>
          </article>
          );
        })}
      </section>
    </PageShell>
  );
}
