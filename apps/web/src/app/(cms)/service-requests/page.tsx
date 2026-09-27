'use client';

import { BellRing, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadingRows } from '@/components/loading-state';
import { PageShell } from '@/components/page-shell';
import { SectionCard } from '@/components/section-card';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { documentId, getCmsServiceRequests, resolveServiceRequest, type CmsServiceRequest } from '@/lib/api-client';
import { errorMessage, failed, loading, ready, type AsyncState } from '@/lib/async-state';
import { readCmsSettings } from '@/lib/cms-storage';
import { shortId } from '@/lib/format';
import { createSocketClient } from '@/lib/socket';
import { humanize } from '@/lib/status-tone';

export default function ServiceRequestsPage() {
  const [requests, setRequests] = useState<CmsServiceRequest[]>([]);
  const [busy, setBusy] = useState('');
  const [state, setState] = useState<AsyncState>(loading);
  const [settings, setSettings] = useState<{ branchId: string; token: string } | null>(null);

  useEffect(() => {
    const current = readCmsSettings();
    setSettings(current);
    if (!current.branchId || !current.token) {
      setState(failed(new Error('This account is not linked to an outlet yet.')));
      return;
    }
    const load = (): void => {
      void getCmsServiceRequests(current.branchId, current.token)
        .then((nextRequests) => {
          setRequests(nextRequests);
          setState(ready);
        })
        .catch((error: unknown) => setState(failed(error, 'Could not load service requests.')));
    };
    load();
    const socket = createSocketClient(current.token);
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
      setRequests(await getCmsServiceRequests(settings.branchId, settings.token));
      toast.success('Request resolved');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not resolve the request.'));
    } finally {
      setBusy('');
    }
  }

  return (
    <PageShell
      description="Guest buzzers and requests for this outlet, newest first. Resolve them as the floor responds."
      eyebrow="Service"
      title="Service requests"
    >
      {state.status === 'error' ? <ErrorState message={state.error ?? ''} /> : null}

      <SectionCard title={`${requests.length} open`}>
        {state.status === 'loading' ? (
          <LoadingRows count={3} />
        ) : requests.length === 0 ? (
          <EmptyState description="Guests can call for water, a waiter, or the bill from their table." icon={BellRing} title="No open requests" />
        ) : (
          <ul className="divide-y">
            {requests.map((request) => {
              const id = documentId(request);
              return (
                <li className="flex flex-wrap items-center gap-3 py-3" key={id}>
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-warning-foreground text-warning">
                    <BellRing aria-hidden="true" className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{humanize(request.requestType)}</p>
                    <p className="text-xs text-muted-foreground">{request.message ?? `Table ···${shortId(request.tableId)}`}</p>
                  </div>
                  <StatusBadge kind="service" value={request.status} />
                  <Button disabled={busy === id} onClick={() => void resolve(request)} size="sm" type="button">
                    <Check />
                    Resolve
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </PageShell>
  );
}
