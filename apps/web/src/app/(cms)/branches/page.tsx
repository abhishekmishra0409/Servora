'use client';

import { Archive, Pencil, Plus, Store } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useCmsSession } from '@/components/cms-session-provider';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { FormField } from '@/components/form-field';
import { PageShell } from '@/components/page-shell';
import { PlanLimitNotice, UsageStrip } from '@/components/plan-limit-notice';
import { SectionCard } from '@/components/section-card';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ApiError,
  archiveCmsBranch,
  createCmsBranch,
  documentId,
  getCmsBranches,
  updateCmsBranch,
  type CmsBranch,
} from '@/lib/api-client';
import { errorMessage, failed, loading, ready, type AsyncState } from '@/lib/async-state';
import { humanize } from '@/lib/status-tone';

export default function BranchesPage() {
  const session = useCmsSession();
  const [branches, setBranches] = useState<CmsBranch[]>([]);
  const [state, setState] = useState<AsyncState>(loading);
  const [limitError, setLimitError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState('');
  const [editingName, setEditingName] = useState('');

  const canAdd = session.can('branches:add');
  const canEdit = session.can('branches:edit');
  const canDelete = session.can('branches:delete');

  async function load(): Promise<void> {
    if (!session.token || !session.tenantId) {
      return;
    }
    try {
      setBranches(await getCmsBranches(session.tenantId, session.token));
      setState(ready);
    } catch (error) {
      setState(failed(error, 'Could not load outlets.'));
    }
  }

  useEffect(() => {
    void load();
  }, [session.token, session.tenantId]);

  async function create(): Promise<void> {
    if (!name.trim()) {
      toast.error('Give the outlet a name.');
      return;
    }

    setBusy(true);
    setLimitError(null);

    try {
      await createCmsBranch({ name: name.trim(), tenantId: session.tenantId }, session.token);
      setName('');
      toast.success('Outlet created');
      await load();
      await session.reload();
      await session.refreshEntitlements();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PLAN_LIMIT_REACHED') {
        setLimitError(error);
      } else {
        toast.error(errorMessage(error, 'Could not create the outlet.'));
      }
    } finally {
      setBusy(false);
    }
  }

  async function saveName(id: string): Promise<void> {
    if (!editingName.trim()) {
      toast.error('The outlet name cannot be empty.');
      return;
    }
    setBusy(true);
    try {
      await updateCmsBranch(id, { name: editingName.trim() }, session.token);
      setEditingId('');
      toast.success('Outlet renamed');
      await load();
      await session.reload();
    } catch (error) {
      toast.error(errorMessage(error, 'Could not rename the outlet.'));
    } finally {
      setBusy(false);
    }
  }

  async function archive(id: string): Promise<void> {
    setBusy(true);
    try {
      await archiveCmsBranch(id, session.token);
      toast.success('Outlet archived. Its past orders and bills are kept.');
      await load();
      await session.reload();
      await session.refreshEntitlements();
    } catch (error) {
      toast.error(errorMessage(error, 'Could not archive the outlet.'));
      throw error;
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
      title="Your locations"
    >
      {state.status === 'error' ? <ErrorState message={state.error ?? ''} onRetry={() => void load()} /> : null}
      <PlanLimitNotice error={limitError} resource="outlets" />
      <UsageStrip cap={cap} label="Outlets" used={used} />

      {canAdd ? (
        <SectionCard title="Add an outlet">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <FormField className="flex-1" htmlFor="outlet-name" label="Outlet name">
              <Input id="outlet-name" onChange={(event) => setName(event.target.value)} placeholder="e.g. Riverside" value={name} />
            </FormField>
            <Button
              disabled={busy || atCap || !name.trim()}
              onClick={() => void create()}
              title={atCap ? 'Your plan’s outlet limit is reached' : undefined}
              type="button"
            >
              <Plus />
              Create outlet
            </Button>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard contentClassName="space-y-0" title={`${branches.length} outlets`}>
        <DataTable
          columns={[
            {
              header: 'Outlet',
              key: 'name',
              render: (branch) => {
                const id = documentId(branch);
                return editingId === id ? (
                  <Input
                    aria-label="Outlet name"
                    autoFocus
                    className="h-8"
                    onChange={(event) => setEditingName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void saveName(id);
                      if (event.key === 'Escape') setEditingId('');
                    }}
                    value={editingName}
                  />
                ) : (
                  <span className="grid">
                    <span className="font-semibold">{branch.name}</span>
                    <span className="text-xs text-muted-foreground">/{branch.slug}</span>
                  </span>
                );
              },
            },
            {
              header: 'Service mode',
              key: 'mode',
              render: (branch) => <span className="text-muted-foreground">{humanize(branch.serviceMode ?? '')}</span>,
            },
            { header: 'Status', key: 'status', render: () => <StatusBadge kind="tenant" value="active" /> },
            {
              className: 'text-right',
              header: '',
              key: 'actions',
              render: (branch) => {
                const id = documentId(branch);
                return (
                  <div className="flex justify-end gap-1">
                    {canEdit ? (
                      editingId === id ? (
                        <>
                          <Button disabled={busy} onClick={() => void saveName(id)} size="sm" type="button">
                            Save
                          </Button>
                          <Button onClick={() => setEditingId('')} size="sm" type="button" variant="ghost">
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          onClick={() => {
                            setEditingId(id);
                            setEditingName(branch.name);
                          }}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <Pencil />
                          Rename
                        </Button>
                      )
                    ) : null}
                    {canDelete ? (
                      <ConfirmDialog
                        confirmLabel="Archive outlet"
                        description="This outlet is taken out of service for everyone."
                        details={[
                          'Staff can no longer sign in to or switch to this outlet.',
                          'Its tables and QR codes stop taking orders.',
                          'Past orders and bills are kept for reporting.',
                        ]}
                        requireText={branch.name}
                        destructive
                        onConfirm={() => archive(id)}
                        title={`Archive ${branch.name}?`}
                        trigger={
                          <Button className="text-destructive hover:text-destructive" disabled={busy} size="sm" type="button" variant="ghost">
                            <Archive />
                            Archive
                          </Button>
                        }
                      />
                    ) : null}
                  </div>
                );
              },
            },
          ]}
          empty={<EmptyState compact description="Create the first outlet above." icon={Store} title="No outlets yet" />}
          loading={state.status === 'loading'}
          rowKey={documentId}
          rows={branches}
          searchPlaceholder="Search outlets"
          searchText={(branch) => `${branch.name} ${branch.slug}`}
        />
      </SectionCard>
    </PageShell>
  );
}
