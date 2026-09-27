'use client';

import { FileSearch } from 'lucide-react';
import { useEffect, useState } from 'react';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadingRows } from '@/components/loading-state';
import { PageShell } from '@/components/page-shell';
import { SectionCard } from '@/components/section-card';
import { Badge } from '@/components/ui/badge';
import { documentId, getCmsAuditLogs, type CmsAuditLog } from '@/lib/api-client';
import { failed, loading, ready, type AsyncState } from '@/lib/async-state';
import { readCmsSettings } from '@/lib/cms-storage';
import { formatDateTime, shortId } from '@/lib/format';
import { humanize } from '@/lib/status-tone';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<CmsAuditLog[]>([]);
  const [state, setState] = useState<AsyncState>(loading);

  useEffect(() => {
    const settings = readCmsSettings();
    if (!settings.tenantId || !settings.branchId || !settings.token) {
      setState(failed(new Error('This account is not linked to an outlet yet.')));
      return;
    }
    void getCmsAuditLogs(settings.tenantId, settings.branchId, settings.token)
      .then((nextLogs) => {
        setLogs(nextLogs);
        setState(ready);
      })
      .catch((error: unknown) => setState(failed(error, 'Could not load audit logs.')));
  }, []);

  return (
    <PageShell
      description="Staff actions, menu changes, table updates, order movement, and billing events for this outlet."
      eyebrow="Audit"
      title="Audit log"
    >
      {state.status === 'error' ? <ErrorState message={state.error ?? ''} /> : null}

      <SectionCard title={`${logs.length} events`}>
        {state.status === 'loading' ? (
          <LoadingRows count={6} />
        ) : logs.length === 0 ? (
          <EmptyState description="Changes made in this workspace will be recorded here." icon={FileSearch} title="No audit activity yet" />
        ) : (
          <ol className="divide-y">
            {logs.map((log) => (
              <li className="flex flex-wrap items-center gap-3 py-3" key={documentId(log)}>
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <FileSearch aria-hidden="true" className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{humanize(log.action)}</p>
                  <p className="text-xs text-muted-foreground">
                    {humanize(log.entityType)} ···{shortId(log.entityId)}
                    {log.createdAt ? ` · ${formatDateTime(log.createdAt)}` : ''}
                  </p>
                </div>
                <Badge variant="outline">{log.actorUserId ? `User ···${shortId(log.actorUserId)}` : 'System'}</Badge>
              </li>
            ))}
          </ol>
        )}
      </SectionCard>
    </PageShell>
  );
}
