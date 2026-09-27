'use client';

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import { useOptionalCmsSession } from '@/components/cms-session-provider';
import { ensureCmsAccessToken } from '@/lib/api-client';
import { errorMessage } from '@/lib/async-state';
import { readCmsSettings } from '@/lib/cms-storage';
import { createSocketClient } from '@/lib/socket';

export interface CmsContext {
  branchId: string;
  tenantId: string;
  token: string;
}

/**
 * What a screen needs before it can load:
 * - `outlet`: a tenant and a selected outlet (most workspace screens)
 * - `tenant`: a tenant only (outlets, roles, subscription)
 * - `account`: just a signed-in user (platform console)
 */
export type ResourceScope = 'outlet' | 'tenant' | 'account';

/**
 * - `loading`: first load, nothing to show yet, so render a skeleton
 * - `ready`: data is on screen (it may be refreshing, or the last refresh may have failed)
 * - `error`: the first load failed, so there is nothing to show
 * - `no-outlet` / `no-tenant`: the session lacks the context this screen needs
 * - `signed-out`: the session could not be restored
 */
export type ResourceStatus = 'loading' | 'ready' | 'error' | 'no-outlet' | 'no-tenant' | 'signed-out';

export interface CmsResource<T> {
  data: T;
  /** Message from the most recent failed load, including a failed background refresh. */
  error: string;
  /** True while re-fetching data that is already on screen. */
  refreshing: boolean;
  reload: () => Promise<void>;
  scope: ResourceScope;
  setData: Dispatch<SetStateAction<T>>;
  status: ResourceStatus;
}

/** Current IDs and token, read fresh so mutations never use a stale snapshot. */
export function readCmsContext(): CmsContext {
  const settings = readCmsSettings();
  return { branchId: settings.branchId, tenantId: settings.tenantId, token: settings.token };
}

/**
 * The one way workspace screens load data. It owns the loading, refreshing,
 * error, and missing-context states so every page reports them the same way,
 * and it wires realtime events and polling to a debounced reload.
 */
export function useCmsResource<T>(
  load: (context: CmsContext) => Promise<T>,
  {
    deps = [],
    events = [],
    initial,
    onEvent,
    pollMs,
    scope = 'outlet',
  }: {
    /** Reload from scratch (with a skeleton) when any of these change. */
    deps?: unknown[];
    /** Socket events that should trigger a background refresh. */
    events?: string[];
    initial: T;
    /** Handle an event in place; return true to skip the automatic refresh. */
    onEvent?: (event: string, payload: unknown) => boolean | void;
    pollMs?: number;
    scope?: ResourceScope;
  },
): CmsResource<T> {
  const session = useOptionalCmsSession();
  // Switching outlet or tenant must refetch from scratch, not keep the old outlet's rows.
  const contextKey = `${session?.tenantId ?? ''}|${session?.branchId ?? ''}`;
  const sessionToken = session?.token ?? '';
  const [data, setData] = useState<T>(initial);
  const [status, setStatus] = useState<ResourceStatus>('loading');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadRef = useRef(load);
  loadRef.current = load;
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const hasData = useRef(false);
  const requestId = useRef(0);

  const run = useCallback(async (): Promise<void> => {
    const settings = readCmsSettings();

    if (scope !== 'account' && !settings.tenantId) {
      setStatus('no-tenant');
      return;
    }
    if (scope === 'outlet' && !settings.branchId) {
      setStatus('no-outlet');
      return;
    }

    const id = ++requestId.current;
    if (hasData.current) {
      setRefreshing(true);
    }

    try {
      const token = await ensureCmsAccessToken();
      if (!token) {
        if (id === requestId.current) setStatus('signed-out');
        return;
      }
      const next = await loadRef.current({ branchId: settings.branchId, tenantId: settings.tenantId, token });
      if (id !== requestId.current) return;
      setData(next);
      hasData.current = true;
      setError('');
      setStatus('ready');
    } catch (caught) {
      if (id !== requestId.current) return;
      setError(errorMessage(caught, 'Could not load this data.'));
      setStatus(hasData.current ? 'ready' : 'error');
    } finally {
      if (id === requestId.current) setRefreshing(false);
    }
  }, [scope]);

  useEffect(() => {
    hasData.current = false;
    setStatus('loading');
    setError('');
    void run();
    // `deps` is caller-supplied on purpose: it lists what should restart the load.
  }, [run, contextKey, ...deps]);

  const eventsKey = events.join('|');

  useEffect(() => {
    if (!eventsKey) return undefined;
    const { token } = readCmsSettings();
    if (!token) return undefined;

    const socket = createSocketClient(token);
    let timer: number | undefined;
    const schedule = (): void => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void run(), 250);
    };

    for (const event of eventsKey.split('|')) {
      socket.on(event, (payload: unknown) => {
        if (onEventRef.current?.(event, payload) === true) return;
        schedule();
      });
    }
    socket.connect();

    return () => {
      window.clearTimeout(timer);
      socket.disconnect();
    };
  }, [eventsKey, run, sessionToken]);

  useEffect(() => {
    if (!pollMs) return undefined;
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void run();
    }, pollMs);
    return () => window.clearInterval(interval);
  }, [pollMs, run]);

  return { data, error, refreshing, reload: run, scope, setData, status };
}
