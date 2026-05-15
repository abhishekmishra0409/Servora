'use client';

import { useEffect, useState } from 'react';

import { getTableContext, joinTable, type GuestSession, type TableContext } from '@/lib/api-client';
import { useCustomerRoute } from '@/lib/customer-route';
import { readGuestSession, writeGuestSession } from '@/lib/customer-storage';

export function CustomerLandingClient({
  initialContext,
  initialError = '',
}: {
  initialContext: TableContext | null;
  initialError?: string;
}) {
  const { basePath, qrToken } = useCustomerRoute();
  const [alias, setAlias] = useState('');
  const [context, setContext] = useState<TableContext | null>(initialContext);
  const [joining, setJoining] = useState(false);
  const [message, setMessage] = useState(initialContext ? 'Choose a name for this table.' : 'Loading table...');
  const [error, setError] = useState(initialError);

  const [storedSession, setStoredSession] = useState<GuestSession | null>(null);

  useEffect(() => {
    if (qrToken) {
      setStoredSession(readGuestSession(qrToken));
    }
  }, [qrToken]);

  useEffect(() => {
    if (storedSession && context) {
      setMessage(`Welcome back, ${storedSession.alias}.`);
    }
  }, [context, storedSession]);

  useEffect(() => {
    if (context) {
      return;
    }
    if (!qrToken) {
      setMessage('This customer URL is missing a QR token.');
      setError('Open a full table URL like /r/{tenant}/{branch}/t/{qrToken}.');
      return;
    }

    let active = true;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10000);
    getTableContext(qrToken, { signal: controller.signal })
      .then((nextContext) => {
        if (!active) return;
        window.clearTimeout(timeoutId);
        setContext(nextContext);
        setMessage(storedSession ? `Welcome back, ${storedSession.alias}.` : 'Choose a name for this table.');
        setError('');
      })
      .catch((nextError: Error) => {
        if (!active) return;
        window.clearTimeout(timeoutId);
        setError(nextError.name === 'AbortError' ? 'Table data timed out. Check the network and try again.' : nextError.message);
        setMessage('We could not load this table.');
      });

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [context, qrToken, storedSession]);

  async function handleJoin(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!qrToken || !basePath) {
      setError('This customer URL is missing a QR token.');
      return;
    }

    const trimmedAlias = alias.trim();
    if (!trimmedAlias) {
      setError('Enter a name for this visit.');
      return;
    }

    setJoining(true);
    setError('');
    try {
      const session = await joinTable(qrToken, trimmedAlias);
      writeGuestSession(qrToken, session);
      setStoredSession(session);
      window.location.assign(`${basePath}/menu`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Could not join this table.');
    } finally {
      setJoining(false);
    }
  }

  return (
    <main className="customer-main customer-main--mobile">
      <section className="customer-entry-card">
        <div className="customer-entry-hero">
          <img
            alt="Signature grilled dish"
            src="https://i.pinimg.com/736x/84/81/ab/8481ab5bd88c3c7ea5f087b3a7d99c90.jpg"
          />
          <div className="customer-entry-hero__shade" />
          <div className="customer-entry-hero__content">
            <span className="customer-table-chip">
              <span className="material-symbols-outlined filled">table_restaurant</span>
              Table {context?.table.tableNo ?? '--'}
            </span>
            <h1>{context ? context.branch.name : 'Join the table'}</h1>
            <p>
              <span className="material-symbols-outlined">location_on</span>
              {context ? context.branch.slug.replaceAll('-', ' ') : message}
            </p>
          </div>
        </div>

        <div className="customer-entry-flow" aria-label="Ordering steps">
          <span className="active"><span className="material-symbols-outlined filled">group</span>Join</span>
          <span><span className="material-symbols-outlined">restaurant_menu</span>Menu</span>
          <span><span className="material-symbols-outlined">shopping_basket</span>Bucket</span>
        </div>

        {storedSession ? (
          <div className="customer-resume-panel">
            <div>
              <p className="eyebrow">Welcome back</p>
              <h2>{storedSession.alias}</h2>
              <p className="muted">Your table session is active.</p>
            </div>
            <a className="button-link" href={`${basePath}/menu`}>
              Open Menu
              <span className="material-symbols-outlined">arrow_forward</span>
            </a>
            <a className="button-secondary" href={`${basePath}/bucket`}>
              View Bucket
            </a>
          </div>
        ) : (
          <form className="customer-join-form" onSubmit={(event) => void handleJoin(event)}>
            <label>
              Your alias for this visit
              <input
                autoComplete="name"
                maxLength={40}
                name="alias"
                onChange={(event) => setAlias(event.target.value)}
                placeholder="e.g., John"
                required
                value={alias}
              />
            </label>
            <button disabled={!context || joining} type="submit">
              {joining ? 'Joining...' : context ? 'Join Table' : 'Loading table'}
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </form>
        )}

        {error ? <p className="error-text">{error}</p> : null}
        {!storedSession ? <p className="muted customer-footnote">Your name only labels items for this table.</p> : null}
      </section>
    </main>
  );
}
