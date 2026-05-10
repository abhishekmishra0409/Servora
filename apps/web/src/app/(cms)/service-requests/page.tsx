'use client';

import { useEffect, useState } from 'react';

import { PageShell } from '../../../components/page-shell';
import { documentId, getCmsServiceRequests, resolveServiceRequest, type CmsServiceRequest } from '../../../lib/api-client';
import { readCmsSettings } from '../../../lib/cms-storage';
import { createSocketClient } from '../../../lib/socket';

export default function ServiceRequestsPage() {
  const [requests, setRequests] = useState<CmsServiceRequest[]>([]);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('Sign in to load service requests from the database.');
  const [settings, setSettings] = useState<{ branchId: string; token: string } | null>(null);

  useEffect(() => {
    const settings = readCmsSettings();
    setSettings(settings);
    if (!settings.branchId || !settings.token) return;
    const load = (): void => {
      void getCmsServiceRequests(settings.branchId, settings.token)
      .then((nextRequests) => {
        setRequests(nextRequests);
        setMessage(nextRequests.length ? '' : 'No open service requests.');
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Could not load service requests.'));
    };
    load();
    const socket = createSocketClient(settings.token);
    socket.on('service_request.created', load);
    socket.on('service_request.resolved', load);
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, []);

  async function resolve(request: CmsServiceRequest): Promise<void> {
    if (!settings?.token) return;
    const id = documentId(request);
    setBusy(id);
    try {
      await resolveServiceRequest(id, settings.token);
      const nextRequests = await getCmsServiceRequests(settings.branchId, settings.token);
      setRequests(nextRequests);
      setMessage(nextRequests.length ? '' : 'No open service requests.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not resolve service request.');
    } finally {
      setBusy('');
    }
  }

  return (
    <PageShell eyebrow="Service Requests" title="Resolve buzzers before they turn into escalations" description="Queue by urgency, table, request type, and assignment so the branch can move fast without extra noise.">
      {message ? <p className="notice-text">{message}</p> : null}
      <section className="panel">
        <div className="cms-list">
          {requests.map((request) => {
            const id = documentId(request);
            return (
            <div className="cms-list-row" key={id}>
              <span aria-hidden="true" className="material-symbols-outlined">notifications_active</span>
              <div>
                <strong>{request.requestType}</strong>
                <p className="muted">{request.message ?? `Table ${request.tableId}`}</p>
              </div>
              <span className="cms-status">{request.status}</span>
              <button disabled={busy === id} onClick={() => void resolve(request)} type="button">Resolve</button>
            </div>
            );
          })}
        </div>
      </section>
    </PageShell>
  );
}
