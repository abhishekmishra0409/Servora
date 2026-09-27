'use client';

import { BellRing, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useCmsSession } from '@/components/cms-session-provider';
import { EmptyState } from '@/components/empty-state';
import { LoadingRows } from '@/components/loading-state';
import { PageShell } from '@/components/page-shell';
import { SectionCard } from '@/components/section-card';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { documentId, getCmsServiceRequests, resolveServiceRequest, type CmsServiceRequest } from '@/lib/api-client';
import { errorMessage } from '@/lib/async-state';
import { shortId } from '@/lib/format';
import { humanize } from '@/lib/status-tone';
import { readCmsContext, useCmsResource } from '@/lib/use-cms-resource';

export default function ServiceRequestsPage() {
  const { can } = useCmsSession();
  const canResolve = can('service-requests:resolve');
  const [busy, setBusy] = useState('');
  const resource = useCmsResource<CmsServiceRequest[]>(({ branchId, token }) => getCmsServiceRequests(branchId, token), {
    events: ['service_request.created', 'service_request.resolved'],
    initial: [],
  });
  const requests = resource.data;

  async function resolve(request: CmsServiceRequest): Promise<void> {
    const id = documentId(request);
    setBusy(id);
    try {
      await resolveServiceRequest(id, readCmsContext().token);
      await resource.reload();
      toast.success('Request resolved');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not resolve the request.'));
    } finally {
      setBusy('');
    }
  }

  return (
    <PageShell
      resource={resource}
      what="service requests"
      description="Guest buzzers and requests for this outlet, newest first. Resolve them as the floor responds."
      eyebrow="Service"
      title="Service requests"
    >
      <SectionCard title={resource.status === 'loading' ? 'Open requests' : `${requests.length} open`}>
        {resource.status === 'loading' ? (
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
                  {canResolve ? (
                    <Button disabled={busy === id} onClick={() => void resolve(request)} size="sm" type="button">
                      <Check />
                      Resolve
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </PageShell>
  );
}
