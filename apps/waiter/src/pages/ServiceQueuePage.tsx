import { useEffect, useMemo, useState } from 'react';

import { documentId, getServiceRequests, getTables, resolveServiceRequest, type ServiceRequest, type TableSummary } from '../lib/api-client';
import { defaultBranchId, readSession } from '../lib/session';

const requestIcon = (requestType: string): string => {
  const normalized = requestType.toLowerCase();
  if (normalized.includes('bill')) return 'payments';
  if (normalized.includes('water') || normalized.includes('drink')) return 'local_drink';
  if (normalized.includes('waiter') || normalized.includes('assist')) return 'support_agent';
  return 'room_service';
};

export function ServiceQueuePage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [busyRequestId, setBusyRequestId] = useState('');
  const [message, setMessage] = useState('Loading service queue...');
  const session = useMemo(() => readSession(), []);
  const branchId = useMemo(() => defaultBranchId(), []);

  async function load(): Promise<void> {
    if (!session?.accessToken || !branchId) {
      setMessage('Sign in first. Branch ID will be saved after login.');
      return;
    }
    try {
      const [nextRequests, nextTables] = await Promise.all([
        getServiceRequests(branchId, session.accessToken),
        getTables(branchId, session.accessToken),
      ]);
      setRequests(nextRequests);
      setTables(nextTables);
      setMessage(nextRequests.length ? '' : 'No open service requests.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load service queue.');
    }
  }

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 12000);
    return () => window.clearInterval(interval);
  }, []);

  async function resolve(request: ServiceRequest): Promise<void> {
    if (!session?.accessToken) {
      setMessage('Sign in first.');
      return;
    }
    const id = documentId(request);
    setBusyRequestId(id);
    try {
      await resolveServiceRequest(id, session.accessToken);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not resolve request.');
    } finally {
      setBusyRequestId('');
    }
  }

  const tableById = new Map(tables.map((table) => [documentId(table), table]));

  return (
    <>
      <header className="waiter-page-head">
        <div>
          <h1>Service Queue</h1>
          <p>Real-time table requests sorted for fast waiter handoff.</p>
          {message ? <p className="waiter-notice">{message}</p> : null}
        </div>
        <div className="waiter-toolbar">
          <span className="waiter-chip waiter-chip--active">All Active ({requests.length})</span>
          <span className="waiter-chip">Assistance</span>
          <span className="waiter-chip">Bill</span>
        </div>
      </header>

      <section className="waiter-service-grid">
        {requests.map((request) => {
          const id = documentId(request);
          const table = tableById.get(String(request.tableId));

          return (
            <article className="waiter-card waiter-service-card" key={id}>
              <div className="relative z-10 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-md bg-surface-container px-3 py-2 text-xl font-black">T{table ? table.tableNo : request.tableId.slice(-4)}</span>
                  <span className="waiter-status waiter-status--danger">
                    <span className="material-symbols-outlined text-[15px]">timer</span>
                    Now
                  </span>
                </div>
                <span className="material-symbols-outlined text-error">{requestIcon(request.requestType)}</span>
              </div>
              <div className="relative z-10">
                <h2 className="text-xl font-bold capitalize">{request.requestType.replaceAll('_', ' ')}</h2>
                {request.message ? <p className="mt-1 text-on-surface-variant">{request.message}</p> : null}
              </div>
              <button className="waiter-primary-button relative z-10 w-full" disabled={busyRequestId === id} onClick={() => void resolve(request)} type="button">
                <span className="material-symbols-outlined">check_circle</span>
                Resolve
              </button>
            </article>
          );
        })}
      </section>
    </>
  );
}
