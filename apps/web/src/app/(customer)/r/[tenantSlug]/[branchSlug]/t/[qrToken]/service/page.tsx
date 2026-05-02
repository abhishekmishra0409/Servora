'use client';

import { useEffect, useState } from 'react';

import { createServiceRequest, getTableContext, type GuestSession, type TableContext } from '@/lib/api-client';
import { useCustomerRoute } from '@/lib/customer-route';
import {
  readGuestSession,
  readRecentServiceRequest,
  writeRecentServiceRequest,
  type GuestServiceRequest,
} from '@/lib/customer-storage';

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

export default function CustomerServicePage() {
  const { qrToken } = useCustomerRoute();
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
    setRecentRequest(readRecentServiceRequest(qrToken));

    getTableContext(qrToken)
      .then((nextContext) => {
        if (!active) {
          return;
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

  async function sendRequest(requestType: RequestType, message?: string): Promise<void> {
    if (!guest?.guestToken || !context?.tableSession) {
      setError('Join the table before sending a service request.');
      return;
    }
    if (!qrToken) {
      setError('This customer URL is missing a QR token.');
      return;
    }

    const trimmedMessage = message?.trim();
    setBusyType(requestType);
    setError('');
    try {
      const request = await createServiceRequest(
        guest.guestToken,
        trimmedMessage ? { message: trimmedMessage, requestType } : { requestType },
      );

      const nextRequest: GuestServiceRequest = {
        createdAt: new Date().toISOString(),
        requestType,
        statusLabel: statusLabelFor(requestType),
        ...(request.message || trimmedMessage ? { message: request.message || trimmedMessage || '' } : {}),
      };

      writeRecentServiceRequest(qrToken, nextRequest);
      setRecentRequest(nextRequest);
      setNotice(`${titleFor(requestType)} request sent.`);
      if (requestType === 'custom') {
        setCustomMessage('');
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Could not send the request.');
    } finally {
      setBusyType('');
    }
  }

  const activeTitle = recentRequest ? titleFor(recentRequest.requestType as RequestType) : 'No active request';
  const activeMessage = recentRequest?.message ?? 'Your latest request will appear here.';

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

      <section className="service-grid">
        {presets.map((preset) => (
          <button
            className={`service-card service-card--button ${busyType === preset.requestType ? 'service-card--busy' : ''}`}
            disabled={busyType !== '' || !guest}
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
            disabled={!guest}
            onChange={(event) => setCustomMessage(event.target.value)}
            placeholder="E.g., Extra spicy sauce, please."
            value={customMessage}
          />
        </label>
        <button disabled={!guest || busyType === 'custom'} onClick={() => void sendRequest('custom', customMessage)} type="button">
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
