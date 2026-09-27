'use client';

import { ArrowRight, CircleCheck, GlassWater, Hand, ReceiptText, Send, Utensils, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { CustomerHeading, CustomerPage } from '@/components/customer-page';
import { ErrorState, NoticeBanner } from '@/components/error-state';
import { InlineSpinner } from '@/components/loading-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  ApiError,
  createServiceRequest,
  documentId,
  getCurrentServiceRequest,
  getTableContext,
  joinTable,
  type CmsServiceRequest,
  type GuestSession,
  type TableContext,
} from '@/lib/api-client';
import { useCustomerRoute } from '@/lib/customer-route';
import {
  clearGuestSession,
  clearRecentServiceRequest,
  readGuestSession,
  writeGuestSession,
  writeRecentServiceRequest,
  type GuestServiceRequest,
} from '@/lib/customer-storage';
import { createSocketClient } from '@/lib/socket';
import { cn } from '@/lib/utils';

type RequestType = 'assistance' | 'bill' | 'custom' | 'cutlery' | 'water';

type ServicePreset = {
  description: string;
  icon: LucideIcon;
  label: string;
  requestType: RequestType;
  statusLabel: string;
};

const presets: ServicePreset[] = [
  { description: 'Quick refill', icon: GlassWater, label: 'Water', requestType: 'water', statusLabel: 'On the way' },
  { description: 'Call a team member', icon: Hand, label: 'Assistance', requestType: 'assistance', statusLabel: 'Requested' },
  { description: 'Ask for the check', icon: ReceiptText, label: 'Bill', requestType: 'bill', statusLabel: 'Requested' },
  { description: 'Spoons, forks, or knives', icon: Utensils, label: 'Cutlery', requestType: 'cutlery', statusLabel: 'On the way' },
];

const relativeTime = (value: string): string => {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) {
    return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  }
  const hours = Math.round(minutes / 60);
  return `${hours} hour${hours === 1 ? '' : 's'} ago`;
};

const titleFor = (requestType: RequestType): string => presets.find((item) => item.requestType === requestType)?.label ?? 'Custom request';
const statusLabelFor = (requestType: RequestType): string => presets.find((item) => item.requestType === requestType)?.statusLabel ?? 'Requested';

function serviceRequestSnapshot(request: CmsServiceRequest): GuestServiceRequest {
  return {
    createdAt: request.createdAt ?? new Date().toISOString(),
    requestId: documentId(request),
    requestType: request.requestType,
    statusLabel: statusLabelFor(request.requestType as RequestType),
    ...(request.message ? { message: request.message } : {}),
    ...(request.tableSessionId ? { tableSessionId: request.tableSessionId } : {}),
  };
}

export default function CustomerServicePage(): ReactNode {
  const { basePath, qrToken } = useCustomerRoute();
  const [context, setContext] = useState<TableContext | null>(null);
  const [guest, setGuest] = useState<GuestSession | null>(null);
  const [recentRequest, setRecentRequest] = useState<GuestServiceRequest | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [busyType, setBusyType] = useState<RequestType | ''>('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!qrToken) {
      setError('Open a full table link like /r/{tenant}/{branch}/t/{qrToken}.');
      return;
    }

    let active = true;
    const session = readGuestSession(qrToken);
    setGuest(session);

    getTableContext(qrToken)
      .then(async (nextContext) => {
        if (!active) return;
        const activeTableSessionId = nextContext.tableSession?.id;
        if (session?.tableSessionId && session.tableSessionId !== activeTableSessionId) {
          clearGuestSession(qrToken);
          setGuest(null);
        }

        if (!session?.guestToken || session.tableSessionId !== activeTableSessionId) {
          clearRecentServiceRequest(qrToken);
          setRecentRequest(null);
        } else {
          const activeRequest = await getCurrentServiceRequest(session.guestToken).catch((nextError: unknown) => {
            if (nextError instanceof ApiError && [401, 404].includes(nextError.status)) {
              clearGuestSession(qrToken);
              setGuest(null);
              return null;
            }
            throw nextError;
          });
          if (!active) return;
          if (activeRequest) {
            const nextRequest = serviceRequestSnapshot(activeRequest);
            writeRecentServiceRequest(qrToken, nextRequest);
            setRecentRequest(nextRequest);
          } else {
            // No open request on the server, so any stored one is stale.
            clearRecentServiceRequest(qrToken);
            setRecentRequest(null);
          }
        }

        setContext(nextContext);
      })
      .catch((nextError: Error) => {
        if (active) setError(nextError.message);
      });

    return () => {
      active = false;
    };
  }, [qrToken]);

  useEffect(() => {
    if (!qrToken || !guest?.guestToken) {
      return;
    }

    const socket = createSocketClient(guest.guestToken);
    socket.on('service_request.resolved', (payload?: { requestId?: string; tableSessionId?: string }) => {
      setRecentRequest((current) => {
        const sameRequest = !payload?.requestId || !current?.requestId || payload.requestId === current.requestId;
        const sameSession = !payload?.tableSessionId || !current?.tableSessionId || payload.tableSessionId === current.tableSessionId;
        if (sameRequest && sameSession) {
          clearRecentServiceRequest(qrToken);
          toast.success('Your request has been resolved');
          return null;
        }
        return current;
      });
    });
    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, [guest?.guestToken, qrToken]);

  async function reconnectGuestSession(): Promise<GuestSession> {
    if (!qrToken) {
      throw new Error('This table link is missing its QR token.');
    }
    const alias = context?.table.tableNo ? `Guest ${context.table.tableNo}` : 'Guest';
    const nextGuest = await joinTable(qrToken, alias);
    writeGuestSession(qrToken, nextGuest);
    setGuest(nextGuest);
    setContext(await getTableContext(qrToken));
    return nextGuest;
  }

  async function createRequestWithGuest(body: { message?: string; requestType: RequestType }): Promise<CmsServiceRequest> {
    let requestGuest = guest?.guestToken ? guest : await reconnectGuestSession();

    try {
      return await createServiceRequest(requestGuest.guestToken, body);
    } catch (nextError) {
      if (!(nextError instanceof ApiError) || ![401, 404].includes(nextError.status)) {
        throw nextError;
      }
      clearGuestSession(qrToken);
      setGuest(null);
      clearRecentServiceRequest(qrToken);
      setRecentRequest(null);
      requestGuest = await reconnectGuestSession();
      return createServiceRequest(requestGuest.guestToken, body);
    }
  }

  async function sendRequest(requestType: RequestType, message?: string): Promise<void> {
    if (!qrToken) {
      setError('This table link is missing its QR token.');
      return;
    }

    const trimmedMessage = message?.trim();
    if (requestType === 'custom' && !trimmedMessage) {
      toast.error('Tell us what you need first.');
      return;
    }

    setBusyType(requestType);
    setError('');
    try {
      const request = await createRequestWithGuest(trimmedMessage ? { message: trimmedMessage, requestType } : { requestType });
      const tableSessionId = request.tableSessionId ?? guest?.tableSessionId ?? context?.tableSession?.id;

      const nextRequest: GuestServiceRequest = {
        createdAt: new Date().toISOString(),
        requestId: documentId(request),
        requestType,
        statusLabel: statusLabelFor(requestType),
        ...(tableSessionId ? { tableSessionId } : {}),
        ...(request.message || trimmedMessage ? { message: request.message || trimmedMessage || '' } : {}),
      };

      writeRecentServiceRequest(qrToken, nextRequest);
      setRecentRequest(nextRequest);
      toast.success(`${titleFor(requestType)} request sent`);
      if (requestType === 'custom') {
        setCustomMessage('');
      }
    } catch (nextError) {
      if (nextError instanceof ApiError && nextError.status === 401) {
        clearGuestSession(qrToken);
        setGuest(null);
        setError('This device could not reconnect to the table. Open the table link again and try once more.');
        return;
      }
      toast.error(nextError instanceof Error ? nextError.message : 'Could not send the request.');
    } finally {
      setBusyType('');
    }
  }

  const canRequest = Boolean(guest?.guestToken || qrToken);

  return (
    <CustomerPage>
      <CustomerHeading
        description={context ? `Tap a request and a team member comes to table ${context.table.tableNo}.` : 'Tap a request and a team member comes to your table.'}
        title="Service"
      />

      {error ? <ErrorState message={error} /> : null}

      {recentRequest ? (
        <Card className="flex-row items-center gap-3 px-4 py-3 shadow-card">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-success-foreground text-success">
            <CircleCheck aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{titleFor(recentRequest.requestType as RequestType)}</p>
            <p className="truncate text-xs text-muted-foreground">
              {recentRequest.message ? `“${recentRequest.message}” · ` : ''}Requested {relativeTime(recentRequest.createdAt)}
            </p>
          </div>
          <Badge variant="warning">{recentRequest.statusLabel}</Badge>
        </Card>
      ) : null}

      {!canRequest ? (
        <NoticeBanner>
          Join the table so staff know where to come.{' '}
          <Link className="inline-flex items-center gap-1 font-semibold underline" href={basePath || '/'}>
            Join table
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        </NoticeBanner>
      ) : null}

      <section aria-label="Quick requests" className="grid grid-cols-2 gap-3">
        {presets.map(({ description, icon: Icon, label, requestType }) => {
          const isBusy = busyType === requestType;
          return (
            <button
              className={cn(
                'grid justify-items-start gap-2 rounded-xl border bg-card p-4 text-left shadow-card transition-all',
                'hover:border-primary/40 hover:bg-accent/40 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                'disabled:pointer-events-none disabled:opacity-60',
              )}
              disabled={busyType !== ''}
              key={requestType}
              onClick={() => void sendRequest(requestType)}
              type="button"
            >
              <span className="inline-flex size-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
                {isBusy ? <InlineSpinner className="size-5" /> : <Icon aria-hidden="true" className="size-5" />}
              </span>
              <span className="text-sm font-semibold">{label}</span>
              <span className="text-xs text-muted-foreground">{description}</span>
            </button>
          );
        })}
      </section>

      <Card className="gap-3 px-4 py-4 shadow-card">
        <div>
          <h2 className="font-semibold">Something else?</h2>
          <p className="text-sm text-muted-foreground">Send a note straight to the floor team.</p>
        </div>
        <Textarea
          aria-label="Custom request"
          disabled={busyType === 'custom'}
          maxLength={280}
          onChange={(event) => setCustomMessage(event.target.value)}
          placeholder="e.g. Extra spicy sauce, please."
          rows={3}
          value={customMessage}
        />
        <Button className="h-11" disabled={busyType !== '' || !customMessage.trim()} onClick={() => void sendRequest('custom', customMessage)} type="button">
          {busyType === 'custom' ? <InlineSpinner /> : <Send />}
          Send request
        </Button>
      </Card>
    </CustomerPage>
  );
}
