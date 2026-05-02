'use client';

import { useEffect, useState } from 'react';

import { PageShell } from '../../../components/page-shell';
import { getCmsServiceRequests, type CmsServiceRequest } from '../../../lib/api-client';
import { readCmsSettings } from '../../../lib/cms-storage';

export default function ServiceRequestsPage() {
  const [requests, setRequests] = useState<CmsServiceRequest[]>([]);
  const [message, setMessage] = useState('Sign in to load service requests from the database.');

  useEffect(() => {
    const settings = readCmsSettings();
    if (!settings.branchId || !settings.token) return;
    void getCmsServiceRequests(settings.branchId, settings.token)
      .then((nextRequests) => {
        setRequests(nextRequests);
        setMessage(nextRequests.length ? '' : 'No open service requests.');
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Could not load service requests.'));
  }, []);

  return (
    <PageShell eyebrow="Service Requests" title="Resolve buzzers before they turn into escalations" description="Queue by urgency, table, request type, and assignment so the branch can move fast without extra noise.">
      {message ? <p className="notice-text">{message}</p> : null}
      <section className="panel">
        <div className="cms-list">
          {requests.map((request) => (
            <div className="cms-list-row" key={request._id ?? request.id}>
              <span aria-hidden="true" className="material-symbols-outlined">notifications_active</span>
              <div>
                <strong>{request.requestType}</strong>
                <p className="muted">{request.message ?? `Table ${request.tableId}`}</p>
              </div>
              <span className="cms-status">{request.status}</span>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
