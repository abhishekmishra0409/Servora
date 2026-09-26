'use client';

import { useEffect, useState } from 'react';

import { PageShell } from '../../../components/page-shell';
import { PlanLimitNotice, UsageStrip } from '../../../components/plan-limit-notice';
import { useCmsSession } from '../../../components/cms-session-provider';
import {
  ApiError,
  archiveCmsBranch,
  createCmsBranch,
  documentId,
  getCmsBranches,
  updateCmsBranch,
  type CmsBranch,
} from '../../../lib/api-client';

export default function BranchesPage() {
  const session = useCmsSession();
  const [branches, setBranches] = useState<CmsBranch[]>([]);
  const [message, setMessage] = useState('Loading outlets...');
  const [limitError, setLimitError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState('');
  const [editingName, setEditingName] = useState('');
  const [confirmArchiveId, setConfirmArchiveId] = useState('');

  const canAdd = session.can('branches:add');
  const canEdit = session.can('branches:edit');
  const canDelete = session.can('branches:delete');

  async function load(): Promise<void> {
    if (!session.token || !session.tenantId) {
      return;
    }

    try {
      const next = await getCmsBranches(session.tenantId, session.token);
      setBranches(next);
      setMessage(next.length === 0 ? 'No outlets yet.' : '');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load outlets.');
    }
  }

  useEffect(() => {
    void load();
  }, [session.token, session.tenantId]);

  async function create(): Promise<void> {
    if (!name.trim()) {
      setMessage('Give the outlet a name.');
      return;
    }

    setBusy(true);
    setLimitError(null);

    try {
      await createCmsBranch({ name: name.trim(), tenantId: session.tenantId }, session.token);
      setName('');
      setMessage('Outlet created.');
      await load();
      await session.reload();
      await session.refreshEntitlements();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PLAN_LIMIT_REACHED') {
        setLimitError(error);
        setMessage('');
      } else {
        setMessage(error instanceof Error ? error.message : 'Could not create the outlet.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function saveName(id: string): Promise<void> {
    setBusy(true);

    try {
      await updateCmsBranch(id, { name: editingName.trim() }, session.token);
      setEditingId('');
      await load();
      await session.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not rename the outlet.');
    } finally {
      setBusy(false);
    }
  }

  async function archive(id: string): Promise<void> {
    setBusy(true);

    try {
      await archiveCmsBranch(id, session.token);
      setConfirmArchiveId('');
      setMessage('Outlet archived. Its past orders and bills are kept.');
      await load();
      await session.reload();
      await session.refreshEntitlements();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not archive the outlet.');
    } finally {
      setBusy(false);
    }
  }

  const cap = session.entitlements?.limits.branches ?? 0;
  const used = session.entitlements?.usage.branches ?? branches.length;
  const atCap = cap > 0 && used >= cap;

  return (
    <PageShell
      description="Each outlet has its own tables, menu, and staff roles. People can hold a different role at each one."
      eyebrow="Outlets"
      title="Your restaurant locations"
    >
      {message ? <p className="notice-text">{message}</p> : null}
      <PlanLimitNotice error={limitError} resource="outlets" />

      <UsageStrip cap={cap} label="Outlets" used={used} />

      {canAdd ? (
        <section className="panel">
          <div className="cms-section-head"><h2>Add an outlet</h2></div>
          <div className="cms-form-grid cms-form-grid--two">
            <label>
              <span>Outlet name</span>
              <input
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Riverside"
                value={name}
              />
            </label>
            <div className="action-row">
              <button
                disabled={busy || atCap || !name.trim()}
                onClick={() => void create()}
                title={atCap ? 'Your plan’s outlet limit is reached' : undefined}
                type="button"
              >
                Create outlet
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="panel">
        <div className="cms-section-head"><h2>Outlets</h2></div>
        <div className="cms-data-table">
          {branches.map((branch) => {
            const id = documentId(branch);

            return (
              <div className="cms-data-row" key={id}>
                <div>
                  {editingId === id ? (
                    <input onChange={(event) => setEditingName(event.target.value)} value={editingName} />
                  ) : (
                    <strong>{branch.name}</strong>
                  )}
                  <small className="muted">/{branch.slug}</small>
                </div>
                <span>{branch.serviceMode?.replaceAll('_', ' ') ?? ''}</span>
                <span className="cms-status">Active</span>
                <div className="action-row">
                  {canEdit ? (
                    editingId === id ? (
                      <>
                        <button disabled={busy} onClick={() => void saveName(id)} type="button">Save</button>
                        <button className="button-quiet" onClick={() => setEditingId('')} type="button">Cancel</button>
                      </>
                    ) : (
                      <button
                        className="button-secondary"
                        onClick={() => {
                          setEditingId(id);
                          setEditingName(branch.name);
                        }}
                        type="button"
                      >
                        Rename
                      </button>
                    )
                  ) : null}
                  {canDelete ? (
                    confirmArchiveId === id ? (
                      <>
                        <button className="danger-button" disabled={busy} onClick={() => void archive(id)} type="button">
                          Confirm archive
                        </button>
                        <button className="button-quiet" onClick={() => setConfirmArchiveId('')} type="button">
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button className="danger-button" onClick={() => setConfirmArchiveId(id)} type="button">
                        Archive
                      </button>
                    )
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </PageShell>
  );
}
