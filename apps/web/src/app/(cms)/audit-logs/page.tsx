'use client';

import { FileSearch } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { LoadingRows } from '@/components/loading-state';
import { PageShell } from '@/components/page-shell';
import { SectionCard } from '@/components/section-card';
import { Badge } from '@/components/ui/badge';
import { documentId, getCmsAuditLogs, type CmsAuditLog } from '@/lib/api-client';
import { formatDateTime, shortId } from '@/lib/format';
import { humanize } from '@/lib/status-tone';
import { useCmsResource } from '@/lib/use-cms-resource';

export default function AuditLogsPage() {
  const logs = useCmsResource<CmsAuditLog[]>(({ branchId, tenantId, token }) => getCmsAuditLogs(tenantId, branchId, token), {
    initial: [],
  });

  return (
    <PageShell
      description="Staff actions, menu changes, table updates, order movement, and billing events for this outlet."
      eyebrow="Audit"
      resource={logs}
      title="Audit log"
      what="the audit log"
    >
      <SectionCard title={logs.status === 'loading' ? 'Recent activity' : `${logs.data.length} events`}>
          {logs.status === 'loading' ? (
            <LoadingRows count={6} />
          ) : logs.data.length === 0 ? (
            <EmptyState description="Changes made in this workspace will be recorded here." icon={FileSearch} title="No audit activity yet" />
          ) : (
            <ol className="divide-y">
              {logs.data.map((log) => (
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
