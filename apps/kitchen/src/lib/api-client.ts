const configuredApiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
const normalizeLocalUrl = (value: string): string => {
  const url = new URL(value);
  if (['localhost', '127.0.0.1', '::1'].includes(url.hostname) && !['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)) {
    url.hostname = window.location.hostname;
  }

  return url.toString().replace(/\/$/, '');
};
const apiUrl = normalizeLocalUrl(configuredApiUrl);
const API_BASE_URL = apiUrl.endsWith('/api/v1') ? apiUrl : `${apiUrl}/api/v1`;
const sessionKey = 'restaurent:kitchen:session';
const branchKey = 'restaurent:kitchen:branchId';
let refreshPromise: Promise<string | null> | null = null;

export interface StaffSession {
  accessToken: string;
  branchId?: string;
  refreshToken: string;
  role: string;
  tenantId: string;
  userId: string;
}

export interface LiveOrder {
  _id?: string;
  grandTotal: number;
  id?: string;
  items: {
    addonSnapshots: { label: string; priceDelta: number }[];
    menuItemId: string;
    name: string;
    notes?: string;
    quantity: number;
    unitPrice: number;
    variantLabel?: string;
  }[];
  notes?: string;
  orderNo: string;
  status: string;
  submittedAt?: string;
  tableId: string;
}

interface ApiOptions extends RequestInit {
  token?: string;
}

export const orderId = (order: LiveOrder): string => order.id ?? String(order._id ?? '');

function readStoredSession(): StaffSession | null {
  const raw = localStorage.getItem(sessionKey);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StaffSession;
  } catch {
    localStorage.removeItem(sessionKey);
    return null;
  }
}

function clearStoredSession(): void {
  localStorage.removeItem(sessionKey);
  localStorage.removeItem(branchKey);
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const session = readStoredSession();
      if (!session?.refreshToken) {
        return null;
      }

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        body: JSON.stringify({ refreshToken: session.refreshToken }),
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const payload = (await response.json().catch(() => null)) as
        | { accessToken?: string; refreshToken?: string }
        | null;

      if (!response.ok || !payload?.accessToken || !payload.refreshToken) {
        clearStoredSession();
        return null;
      }

      const nextSession = { ...session, accessToken: payload.accessToken, refreshToken: payload.refreshToken };
      localStorage.setItem(sessionKey, JSON.stringify(nextSession));
      return payload.accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

function requestHeaders(options: ApiOptions, tokenOverride?: string): Headers {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const storedToken = options.token ? readStoredSession()?.accessToken : '';
  const authToken = tokenOverride ?? storedToken ?? options.token ?? '';
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  return headers;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as { message?: string } | T | null;

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload && payload.message
        ? payload.message
        : 'Request failed';
    throw new Error(message);
  }

  return payload as T;
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers: requestHeaders(options) });

  if (response.status === 401 && options.token) {
    const nextToken = await refreshAccessToken();
    if (nextToken) {
      const retryResponse = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: requestHeaders(options, nextToken),
      });
      return parseResponse<T>(retryResponse);
    }

    window.location.assign('/login');
  }

  return parseResponse<T>(response);
}

export const login = (email: string, password: string, branchId?: string): Promise<StaffSession> =>
  apiRequest<StaffSession>('/auth/login', {
    body: JSON.stringify({ branchId: branchId || undefined, email, password }),
    method: 'POST',
  });

export const getLiveOrders = (branchId: string, token: string): Promise<LiveOrder[]> =>
  apiRequest<LiveOrder[]>(`/orders/live?branchId=${encodeURIComponent(branchId)}`, { token });

export const updateOrderStatus = (id: string, status: string, token: string): Promise<LiveOrder> =>
  apiRequest<LiveOrder>(`/orders/${id}/status`, {
    body: JSON.stringify({ status }),
    method: 'PATCH',
    token,
  });
