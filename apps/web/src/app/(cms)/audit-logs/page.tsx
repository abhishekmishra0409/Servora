'use client';

import { useEffect, useState } from 'react';

import { PageShell } from '../../../components/page-shell';
import { documentId, getCmsAuditLogs, type CmsAuditLog } from '../../../lib/api-client';
import { readCmsSettings } from '../../../lib/cms-storage';

const formatTime = (value?: string): string => value ? new Date(value).toLocaleString() : 'Just now';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<CmsAuditLog[]>([]);
  const [message, setMessage] = useState('Sign in to load audit logs.');

  useEffect(() => {
    const settings = readCmsSettings();
    if (!settings.tenantId || !settings.branchId || !settings.token) return;
    void getCmsAuditLogs(settings.tenantId, settings.branchId, settings.token)
      .then((nextLogs) => {
        setLogs(nextLogs);
        setMessage(nextLogs.length ? '' : 'No audit activity recorded yet.');
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Could not load audit logs.'));
  }, []);

  return (
    <PageShell eyebrow="Audit" title="Trace operational changes" description="Review staff actions, menu changes, table updates, order movement, and billing events from the active branch.">
      {message ? <p className="notice-text">{message}</p> : null}
      <section className="panel">
        <div className="cms-list">
          {logs.map((log) => (
            <div className="cms-list-row" key={documentId(log)}>
              <span className="material-symbols-outlined" aria-hidden="true">manage_search</span>
              <div>
                <strong>{log.action}</strong>
                <p className="muted">{log.entityType} {log.entityId} · {formatTime(log.createdAt)}</p>
              </div>
              <span className="cms-status">{log.actorUserId ? `User ${log.actorUserId.slice(-4)}` : 'System'}</span>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

