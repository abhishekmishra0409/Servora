'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { PageShell } from '../../../components/page-shell';
import { PlanLimitNotice, UsageStrip } from '../../../components/plan-limit-notice';
import { useCmsSession } from '../../../components/cms-session-provider';
import {
  ApiError,
  createCmsTable,
  deleteCmsTable,
  documentId,
  updateCmsTable,
  type CmsTable,
} from '../../../lib/api-client';
import { isLocalhostOrigin } from '../../../lib/customer-origin';
import { createSocketClient } from '../../../lib/socket';
import { useTableQr } from '../../../lib/use-table-qr';

export default function TablesPage() {
  const session = useCmsSession();
  const qr = useTableQr({ width: 220 });
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState({ capacity: '4', floorId: '', tableNo: '' });
  const [limitError, setLimitError] = useState<ApiError | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState('');

  const { branchId, tenantId, token } = session;
  const canAdd = session.can('tables:add');
  const canEdit = session.can('tables:edit');
  const canDelete = session.can('tables:delete');
  const canRegenerate = session.can('tables:regenerate-qr', 'qr:regenerate');
  const canPrint = session.can('qr:view');

  // Seed the floor picker from whatever floor the existing tables sit on.
  useEffect(() => {
    setForm((current) => ({
      ...current,
      floorId: current.floorId || (qr.tables.find((table) => table.floorId)?.floorId ?? ''),
    }));
  }, [qr.tables]);

  useEffect(() => {
    const socket = token ? createSocketClient(token) : null;

    socket?.on('table.status_changed', () => void qr.reload());
    ['floor.changed', 'order.created', 'order.status_updated', 'payment.status_updated'].forEach((event) => {
      socket?.on(event, () => void qr.reload());
    });
    socket?.connect();

    return () => {
      socket?.disconnect();
    };
    // Re-subscribe only when the session token changes; qr.reload is stable.
  }, [token]);

  function resetForm(): void {
    setEditingId('');
    setForm({ capacity: '4', floorId: qr.tables.find((table) => table.floorId)?.floorId ?? '', tableNo: '' });
    setLimitError(null);
  }

  function edit(table: CmsTable): void {
    setEditingId(documentId(table));
    setForm({ capacity: String(table.capacity), floorId: table.floorId ?? '', tableNo: table.tableNo });
  }

  async function submit(): Promise<void> {
    if (!tenantId || !branchId || !token || !form.floorId || !form.tableNo.trim()) {
      qr.setMessage('Outlet, floor, table number, and a signed-in session are all required.');
      return;
    }

    setLimitError(null);

    try {
      if (editingId) {
        await updateCmsTable(
          editingId,
          { capacity: Number(form.capacity), floorId: form.floorId, tableNo: form.tableNo },
          token,
        );
      } else {
        await createCmsTable(
          {
            branchId,
            capacity: Number(form.capacity),
            floorId: form.floorId,
            tableNo: form.tableNo.trim(),
            tenantId,
          },
          token,
        );
      }

      resetForm();
      await qr.reload();
      await session.refreshEntitlements();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PLAN_LIMIT_REACHED') {
        setLimitError(error);
        qr.setMessage('');
      } else {
        qr.setMessage(error instanceof Error ? error.message : 'Could not save the table.');
      }
    }
  }

  async function remove(table: CmsTable): Promise<void> {
    if (!token) return;

    try {
      await deleteCmsTable(documentId(table), token);
      setConfirmDeleteId('');
      await qr.reload();
      await session.refreshEntitlements();
    } catch (error) {
      qr.setMessage(error instanceof Error ? error.message : 'Could not delete the table.');
    }
  }

  const cap = session.entitlements?.limits.tables ?? 0;
  const used = session.entitlements?.usage.tables ?? qr.tables.length;
  const atCap = cap > 0 && used >= cap;

  return (
    <PageShell
      description="Tables, their live status, and the customer QR code each one carries."
      eyebrow="Tables"
      title="Table and QR operations"
      toolbar={
        canPrint ? (
          <Link className="button-secondary" href="/qr">
            <span aria-hidden="true" className="material-symbols-outlined">print</span>
            Print QR codes
          </Link>
        ) : null
      }
    >
      {qr.message ? <p className="notice-text">{qr.message}</p> : null}
      <PlanLimitNotice error={limitError} resource="tables" />

      <UsageStrip cap={cap} label="Tables" used={used} />

      {canAdd || canEdit ? (
        <section className="cms-settings-grid">
          <article className="panel">
            <div className="cms-section-head">
              <h2>{editingId ? 'Update table' : 'Add table'}</h2>
              {editingId ? (
                <button className="button-secondary" onClick={resetForm} type="button">Cancel</button>
              ) : null}
            </div>
            <div className="form-stack">
              <label>
                Table number
                <input onChange={(event) => setForm({ ...form, tableNo: event.target.value })} value={form.tableNo} />
              </label>
              <label>
                Capacity
                <input
                  min="1"
                  onChange={(event) => setForm({ ...form, capacity: event.target.value })}
                  type="number"
                  value={form.capacity}
                />
              </label>
              <label>
                Floor ID
                <input onChange={(event) => setForm({ ...form, floorId: event.target.value })} value={form.floorId} />
              </label>
              <button
                disabled={!editingId && atCap}
                onClick={() => void submit()}
                title={!editingId && atCap ? 'Your plan’s table limit is reached' : undefined}
                type="button"
              >
                {editingId ? 'Update table' : 'Create table'}
              </button>
            </div>
          </article>

          <article className="panel">
            <div className="cms-section-head"><h2>Customer QR link</h2></div>
            <div className="form-stack">
              <label>
                Customer app origin
                <input
                  onChange={(event) => qr.setCustomerOrigin(event.target.value)}
                  value={qr.customerOrigin}
                />
              </label>
              {isLocalhostOrigin(qr.customerOrigin) ? (
                <p className="notice-text">
                  This origin is <strong>localhost</strong>, so these codes only work on this computer.
                  Open the CMS from your real domain before printing.
                </p>
              ) : null}
              <p className="muted">
                Each code encodes the full table URL above, not just the token, and defaults to the
                address you opened the CMS from. Regenerate a table’s code when a printed one is
                compromised or the table is reissued.
              </p>
            </div>
          </article>
        </section>
      ) : null}

      <section className="cms-table-grid">
        {qr.tables.map((table) => {
          const tableId = documentId(table);
          const url = qr.customerUrl(table.qrToken);

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
                {qr.qrImages[tableId] ? (
                  <img alt={`Customer QR code for table ${table.tableNo}`} src={qr.qrImages[tableId]} />
                ) : (
                  <span aria-hidden="true" className="material-symbols-outlined">qr_code_2</span>
                )}
              </div>
              <div className="cms-qr-link">
                <strong>{table.qrToken ?? 'No QR token'}</strong>
                {url ? <a href={url} rel="noreferrer" target="_blank">{url}</a> : null}
              </div>
              <div className="action-row">
                {canEdit ? (
                  <button className="button-secondary" onClick={() => edit(table)} type="button">Edit</button>
                ) : null}
                {canRegenerate ? (
                  <button className="button-secondary" onClick={() => void qr.regenerate(table)} type="button">
                    Regenerate QR
                  </button>
                ) : null}
                {canDelete ? (
                  confirmDeleteId === tableId ? (
                    <>
                      <button className="danger-button" onClick={() => void remove(table)} type="button">
                        Confirm delete
                      </button>
                      <button className="button-quiet" onClick={() => setConfirmDeleteId('')} type="button">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button className="danger-button" onClick={() => setConfirmDeleteId(tableId)} type="button">
                      Delete
                    </button>
                  )
                ) : null}
              </div>
            </article>
          );
        })}
      </section>
    </PageShell>
  );
}
