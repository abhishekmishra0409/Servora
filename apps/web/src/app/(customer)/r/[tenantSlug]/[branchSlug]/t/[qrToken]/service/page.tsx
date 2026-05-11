'use client';

import { useEffect, useState } from 'react';

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
  readRecentServiceRequest,
  writeGuestSession,
  writeRecentServiceRequest,
  type GuestServiceRequest,
} from '@/lib/customer-storage';
import { createSocketClient } from '@/lib/socket';

type RequestType = 'assistance' | 'bill' | 'custom' | 'cutlery' | 'water';

type ServicePreset = {
  description: string;
  icon: string;
  label: string;
  requestType: RequestType;
  statusLabel: string;
};

const presets: ServicePreset[] = [
  {
    description: 'Quick refill request',
    icon: 'water_drop',
    label: 'Water',
    requestType: 'water',
    statusLabel: 'ON THE WAY',
  },
  {
    description: 'Need staff support',
    icon: 'front_hand',
    label: 'Assistance',
    requestType: 'assistance',
    statusLabel: 'REQUESTED',
  },
  {
    description: 'Request the check',
    icon: 'receipt_long',
    label: 'Bill',
    requestType: 'bill',
    statusLabel: 'REQUESTED',
  },
  {
    description: 'Extra spoons, forks, or knives',
    icon: 'restaurant',
    label: 'Cutlery',
    requestType: 'cutlery',
    statusLabel: 'ON THE WAY',
  },
];

const relativeTime = (value: string): string => {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diffMs / 60000));
  if (minutes < 60) {
    return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  }
  const hours = Math.round(minutes / 60);
  return `${hours} hour${hours === 1 ? '' : 's'} ago`;
};

const titleFor = (requestType: RequestType): string => {
  const preset = presets.find((item) => item.requestType === requestType);
  return preset?.label ?? 'Custom Request';
};

const statusLabelFor = (requestType: RequestType): string => {
  const preset = presets.find((item) => item.requestType === requestType);
  return preset?.statusLabel ?? 'REQUESTED';
};

function requestMatchesActiveSession(request: GuestServiceRequest | null, nextContext: TableContext): boolean {
  const activeTableSessionId = nextContext.tableSession?.id;
  return Boolean(request?.tableSessionId && activeTableSessionId && request.tableSessionId === activeTableSessionId);
}

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

export default function CustomerServicePage() {
  const { basePath, qrToken } = useCustomerRoute();
  const [context, setContext] = useState<TableContext | null>(null);
  const [guest, setGuest] = useState<GuestSession | null>(null);
  const [recentRequest, setRecentRequest] = useState<GuestServiceRequest | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [busyType, setBusyType] = useState<RequestType | ''>('');
  const [notice, setNotice] = useState('Loading service request options...');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!qrToken) {
      setNotice('This customer URL is missing a QR token.');
      setError('Open a full table URL like /r/{tenant}/{branch}/t/{qrToken}.');
      return;
    }

    let active = true;
    const session = readGuestSession(qrToken);
    setGuest(session);

    getTableContext(qrToken)
      .then(async (nextContext) => {
        if (!active) {
          return;
        }
        const storedRequest = readRecentServiceRequest(qrToken);
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
          if (!active) {
            return;
          }
          if (activeRequest) {
            const nextRequest = serviceRequestSnapshot(activeRequest);
            writeRecentServiceRequest(qrToken, nextRequest);
            setRecentRequest(nextRequest);
          } else if (requestMatchesActiveSession(storedRequest, nextContext)) {
            clearRecentServiceRequest(qrToken);
            setRecentRequest(null);
          } else {
            clearRecentServiceRequest(qrToken);
            setRecentRequest(null);
          }
        }

        setContext(nextContext);
        setNotice('Tap a request or send a custom message.');
      })
      .catch((nextError: Error) => {
        if (!active) {
          return;
        }
        setError(nextError.message);
        setNotice('Service requests could not be loaded.');
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
          setNotice('Your request has been resolved.');
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
      throw new Error('This customer URL is missing a QR token.');
    }

    setNotice('Reconnecting this device to the table...');
    const alias = context?.table.tableNo ? `Guest ${context.table.tableNo}` : 'Guest';
    const nextGuest = await joinTable(qrToken, alias);
    writeGuestSession(qrToken, nextGuest);
    setGuest(nextGuest);
    const nextContext = await getTableContext(qrToken);
    setContext(nextContext);
    return nextGuest;
  }

  async function guestForRequest(): Promise<GuestSession> {
    if (guest?.guestToken) {
      return guest;
    }

    return reconnectGuestSession();
  }

  async function createRequestWithGuest(body: { message?: string; requestType: RequestType }): Promise<CmsServiceRequest> {
    let requestGuest = await guestForRequest();

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
      setError('This customer URL is missing a QR token.');
      return;
    }

    const trimmedMessage = message?.trim();
    setBusyType(requestType);
    setError('');
    try {
      const requestBody = trimmedMessage ? { message: trimmedMessage, requestType } : { requestType };
      const request = await createRequestWithGuest(requestBody);
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
      setNotice(`${titleFor(requestType)} request sent.`);
      if (requestType === 'custom') {
        setCustomMessage('');
      }
    } catch (nextError) {
      if (nextError instanceof ApiError && nextError.status === 401) {
        clearGuestSession(qrToken);
        setGuest(null);
        setNotice('This device could not reconnect to the table.');
        setError('Open the table link again and try once more.');
        return;
      }
      setError(nextError instanceof Error ? nextError.message : 'Could not send the request.');
    } finally {
      setBusyType('');
    }
  }

  const activeTitle = recentRequest ? titleFor(recentRequest.requestType as RequestType) : 'No active request';
  const activeMessage = recentRequest?.message ?? 'Your latest request will appear here.';
  const canReconnectToTable = Boolean(qrToken);
  const canRequest = Boolean(guest?.guestToken || canReconnectToTable);

  return (
    <main className="customer-main customer-main--mobile">
      <section className="customer-header customer-header--service">
        <div>
          <h1>At Your Service</h1>
          <p className="muted">Tap to request immediate assistance to Table {context?.table.tableNo ?? '42'}.</p>
        </div>
      </section>

      {recentRequest ? (
        <section className="customer-request-status">
          <div className="customer-request-status__icon">
            <span className="material-symbols-outlined">check_circle</span>
          </div>
          <div>
            <h2>{activeTitle}</h2>
            <p className="muted">Requested {relativeTime(recentRequest.createdAt)}</p>
          </div>
          <span className="customer-request-status__chip">{recentRequest.statusLabel}</span>
        </section>
      ) : null}

      {notice ? <p className="notice-text">{notice}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {!canRequest ? (
        <section className="customer-panel customer-service-join">
          <div>
            <h2>Join table to request service</h2>
            <p className="muted">Service requests need your table session so staff know where to respond.</p>
          </div>
          <a className="button-link" href={basePath || '/'}>
            Join Table
            <span className="material-symbols-outlined">arrow_forward</span>
          </a>
        </section>
      ) : null}

      <section className="service-grid">
        {presets.map((preset) => (
          <button
            className={`service-card service-card--button ${busyType === preset.requestType ? 'service-card--busy' : ''}`}
            disabled={busyType !== ''}
            key={preset.requestType}
            onClick={() => void sendRequest(preset.requestType)}
            type="button"
          >
            <span className="service-card__icon">
              <span className="material-symbols-outlined">{preset.icon}</span>
            </span>
            <strong>{preset.label}</strong>
            <span className="muted">{preset.description}</span>
          </button>
        ))}
      </section>

      <section className="customer-panel customer-request-form">
        <h2>Custom Request</h2>
        <p className="muted">Need something specific? Let us know.</p>
        <label>
          <span className="sr-only">Custom request message</span>
          <textarea
            disabled={busyType === 'custom'}
            onChange={(event) => setCustomMessage(event.target.value)}
            placeholder="E.g., Extra spicy sauce, please."
            value={customMessage}
          />
        </label>
        <button disabled={busyType === 'custom'} onClick={() => void sendRequest('custom', customMessage)} type="button">
          <span className="material-symbols-outlined">send</span>
          Send Request
        </button>
      </section>

      {recentRequest ? (
        <section className="customer-request-summary">
          <div>
            <span className="eyebrow">Latest Request</span>
            <h2>{activeTitle}</h2>
            <p className="muted">{activeMessage}</p>
          </div>
          <span className="status-pill">{recentRequest.statusLabel}</span>
        </section>
      ) : null}
    </main>
  );
}
