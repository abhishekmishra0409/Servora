'use client';

import { Armchair, FileText, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useCmsSession } from '@/components/cms-session-provider';
import { useConfirm } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { ErrorState, NoticeBanner } from '@/components/error-state';
import { FormActions, FormField } from '@/components/form-field';
import { LoadingCards } from '@/components/loading-state';
import { PageShell } from '@/components/page-shell';
import { PlanLimitNotice, UsageStrip } from '@/components/plan-limit-notice';
import { QrTableCard } from '@/components/qr-table-card';
import { SectionCard } from '@/components/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ApiError,
  createCmsTable,
  deleteCmsTable,
  documentId,
  updateCmsTable,
  type CmsTable,
} from '@/lib/api-client';
import { errorMessage } from '@/lib/async-state';
import { isLocalhostOrigin } from '@/lib/customer-origin';
import { downloadTableQrPdf, downloadTableQrPng, type TableQrCard } from '@/lib/qr-download';
import { createSocketClient } from '@/lib/socket';
import { useTableQr } from '@/lib/use-table-qr';

export default function TablesPage() {
  const session = useCmsSession();
  const qr = useTableQr({ width: 220 });
  const confirm = useConfirm();
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState({ capacity: '4', floorId: '', tableNo: '' });
  const [limitError, setLimitError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState('');

  const { branchId, tenantId, token } = session;
  const canAdd = session.can('tables:add');
  const canEdit = session.can('tables:edit');
  const canDelete = session.can('tables:delete');
  const canRegenerate = session.can('tables:regenerate-qr');

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
    window.scrollTo({ behavior: 'smooth', top: 0 });
  }

  async function submit(): Promise<void> {
    if (!tenantId || !branchId || !token || !form.floorId || !form.tableNo.trim()) {
      toast.error('Outlet, floor, and table number are all required.');
      return;
    }

    setLimitError(null);
    setSaving(true);

    try {
      if (editingId) {
        await updateCmsTable(
          editingId,
          { capacity: Number(form.capacity), floorId: form.floorId, tableNo: form.tableNo },
          token,
        );
        toast.success(`Table ${form.tableNo} updated`);
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
        toast.success(`Table ${form.tableNo.trim()} created`);
      }

      resetForm();
      await qr.reload();
      await session.refreshEntitlements();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PLAN_LIMIT_REACHED') {
        setLimitError(error);
      } else {
        toast.error(errorMessage(error, 'Could not save the table.'));
      }
    } finally {
      setSaving(false);
    }
  }

  async function remove(table: CmsTable): Promise<void> {
    if (!token) return;

    try {
      await deleteCmsTable(documentId(table), token);
      toast.success(`Table ${table.tableNo} deleted`);
      await qr.reload();
      await session.refreshEntitlements();
    } catch (error) {
      toast.error(errorMessage(error, 'Could not delete the table.'));
      throw error;
    }
  }

  async function regenerate(table: CmsTable): Promise<void> {
    const ok = await confirm({
      confirmLabel: 'Regenerate QR',
      description: `Table ${table.tableNo} gets a brand-new code.`,
      details: [
        'Printed or downloaded codes for this table stop working immediately.',
        'Guests currently seated keep their session until it closes.',
        'Download and reprint the new code afterwards.',
      ],
      title: `Regenerate the QR code for table ${table.tableNo}?`,
      tone: 'warning',
    });
    if (!ok) return;
    await qr.regenerate(table);
    toast.success(`New QR code issued for table ${table.tableNo}`);
  }

  /** Everything the downloaded artwork prints, resolved from live data. */
  function cardFor(table: CmsTable): TableQrCard {
    return {
      brand: qr.tenant?.legalName ?? '',
      outlet: qr.branch?.name ?? '',
      tableNo: table.tableNo,
      url: qr.customerUrl(table.qrToken),
    };
  }

  async function downloadOne(table: CmsTable): Promise<void> {
    const tableId = documentId(table);
    setDownloading(tableId);

    try {
      await downloadTableQrPng(cardFor(table));
    } catch (error) {
      toast.error(errorMessage(error, 'Could not build the download.'));
    } finally {
      setDownloading('');
    }
  }

  async function downloadAll(): Promise<void> {
    setDownloading('all');

    try {
      const cards = qr.tables.filter((table) => table.qrToken).map(cardFor);
      const outlet = qr.branch?.name ?? 'outlet';

      await downloadTableQrPdf(cards, `${outlet.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-table-qr-codes.pdf`);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not build the PDF.'));
    } finally {
      setDownloading('');
    }
  }

  const cap = session.entitlements?.limits.tables ?? 0;
  const used = session.entitlements?.usage.tables ?? qr.tables.length;
  const atCap = cap > 0 && used >= cap;
  const downloadable = qr.tables.filter((table) => table.qrToken).length;
  const isLoading = qr.message === 'Loading tables...';
  const loadError = !isLoading && qr.message && qr.tables.length === 0 && !qr.message.startsWith('No tables') ? qr.message : '';

  return (
    <PageShell
      actions={
        downloadable > 0 ? (
          <Button disabled={downloading !== ''} onClick={() => void downloadAll()} type="button" variant="outline">
            <FileText />
            {downloading === 'all' ? 'Preparing PDF' : `Download all ${downloadable} as PDF`}
          </Button>
        ) : undefined
      }
      description="Tables, their live status, and the customer QR code each one carries."
      eyebrow="Tables"
      title="Tables and QR codes"
    >
      {loadError ? <ErrorState message={loadError} onRetry={() => void qr.reload()} /> : null}
      <PlanLimitNotice error={limitError} resource="tables" />
      <UsageStrip cap={cap} label="Tables" used={used} />

      {canAdd || canEdit ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <SectionCard
            actions={
              editingId ? (
                <Button onClick={resetForm} size="sm" type="button" variant="ghost">
                  Cancel
                </Button>
              ) : undefined
            }
            title={editingId ? 'Update table' : 'Add table'}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField htmlFor="table-no" label="Table number" required>
                <Input
                  id="table-no"
                  onChange={(event) => setForm({ ...form, tableNo: event.target.value })}
                  placeholder="12"
                  value={form.tableNo}
                />
              </FormField>
              <FormField htmlFor="table-capacity" label="Capacity">
                <Input
                  id="table-capacity"
                  min="1"
                  onChange={(event) => setForm({ ...form, capacity: event.target.value })}
                  type="number"
                  value={form.capacity}
                />
              </FormField>
              <FormField className="sm:col-span-2" hint="Copied from an existing table on this outlet when left blank." htmlFor="table-floor" label="Floor ID" required>
                <Input
                  id="table-floor"
                  onChange={(event) => setForm({ ...form, floorId: event.target.value })}
                  value={form.floorId}
                />
              </FormField>
            </div>
            <FormActions>
              <Button
                disabled={saving || (!editingId && atCap)}
                onClick={() => void submit()}
                title={!editingId && atCap ? 'Your plan’s table limit is reached' : undefined}
                type="button"
              >
                {editingId ? null : <Plus />}
                {editingId ? 'Update table' : 'Create table'}
              </Button>
            </FormActions>
          </SectionCard>

          <SectionCard
            description="Each code encodes the full table URL, not just the token, so a printed code works with nothing else configured."
            title="Customer QR link"
          >
            <FormField htmlFor="customer-origin" label="Customer app origin">
              <Input id="customer-origin" onChange={(event) => qr.setCustomerOrigin(event.target.value)} value={qr.customerOrigin} />
            </FormField>
            {isLocalhostOrigin(qr.customerOrigin) ? (
              <NoticeBanner>
                This origin is <strong>localhost</strong>, so these codes only work on this computer. Open the CMS from your
                real domain before you download them.
              </NoticeBanner>
            ) : null}
            <p className="text-sm text-muted-foreground">
              Regenerate a table’s code when a printed one is compromised or the table is reissued.
            </p>
          </SectionCard>
        </section>
      ) : null}

      {isLoading ? (
        <LoadingCards className="2xl:grid-cols-4" count={8} variant="qr" />
      ) : qr.tables.length === 0 ? (
        <EmptyState
          description={canAdd ? 'Create the first table above to generate its QR code.' : 'No tables have been set up for this outlet yet.'}
          icon={Armchair}
          title="No tables yet"
        />
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {qr.tables.map((table) => {
            const tableId = documentId(table);
            return (
              <QrTableCard
                canDelete={canDelete}
                canEdit={canEdit}
                canRegenerate={canRegenerate}
                downloading={downloading === tableId || downloading === 'all'}
                key={tableId}
                onDelete={() => remove(table)}
                onDownload={() => void downloadOne(table)}
                onEdit={() => edit(table)}
                onRegenerate={() => void regenerate(table)}
                qrImage={qr.qrImages[tableId]}
                table={table}
                url={qr.customerUrl(table.qrToken)}
              />
            );
          })}
        </section>
      )}
    </PageShell>
  );
}
