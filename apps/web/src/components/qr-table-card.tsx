'use client';

import { Download, Pencil, QrCode, RefreshCw, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { CmsTable } from '@/lib/api-client';

export function QrTableCard({
  canDelete,
  canDownload,
  canEdit,
  canRegenerate,
  downloading,
  onDelete,
  onDownload,
  onEdit,
  onRegenerate,
  qrImage,
  table,
  url,
}: {
  canDelete: boolean;
  canDownload: boolean;
  canEdit: boolean;
  canRegenerate: boolean;
  downloading: boolean;
  onDelete: () => Promise<void>;
  onDownload: () => void;
  onEdit: () => void;
  onRegenerate: () => void;
  qrImage?: string | undefined;
  table: CmsTable;
  url: string;
}): ReactNode {
  return (
    <Card className="gap-4 px-4 py-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Table {table.tableNo}</h2>
          <p className="text-xs text-muted-foreground">{table.capacity} seats</p>
        </div>
        <StatusBadge kind="table" value={table.status} />
      </div>

      <div
        aria-label={`QR preview for table ${table.tableNo}`}
        className="flex aspect-square items-center justify-center rounded-lg border bg-white p-3 [background-image:linear-gradient(90deg,rgb(36_27_22/0.06)_1px,transparent_1px),linear-gradient(rgb(36_27_22/0.06)_1px,transparent_1px)] [background-size:18px_18px]"
      >
        {qrImage ? (
          <img alt={`Customer QR code for table ${table.tableNo}`} className="max-h-full max-w-full rounded-md bg-white" src={qrImage} />
        ) : (
          <QrCode aria-hidden="true" className="size-16 text-muted-foreground/50" />
        )}
      </div>

      <div className="min-w-0 space-y-0.5">
        <p className="truncate text-sm font-medium">{table.qrToken ?? 'No QR token'}</p>
        {url ? (
          <a className="block truncate text-xs text-primary underline-offset-2 hover:underline" href={url} rel="noreferrer" target="_blank">
            {url}
          </a>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {canDownload && table.qrToken ? (
          <Button disabled={downloading} onClick={onDownload} size="sm" type="button" variant="outline">
            <Download />
            {downloading ? 'Preparing' : 'Download'}
          </Button>
        ) : null}
        {canEdit ? (
          <Button onClick={onEdit} size="sm" type="button" variant="outline">
            <Pencil />
            Edit
          </Button>
        ) : null}
        {canRegenerate ? (
          <Button onClick={onRegenerate} size="sm" type="button" variant="outline">
            <RefreshCw />
            Regenerate QR
          </Button>
        ) : null}
        {canDelete ? (
          <ConfirmDialog
            confirmLabel="Delete table"
            description={`Table ${table.tableNo} and its QR code will stop working immediately. Printed codes for this table become invalid.`}
            destructive
            onConfirm={onDelete}
            title={`Delete table ${table.tableNo}?`}
            trigger={
              <Button className="text-destructive hover:text-destructive" size="sm" type="button" variant="ghost">
                <Trash2 />
                Delete
              </Button>
            }
          />
        ) : null}
      </div>
    </Card>
  );
}
