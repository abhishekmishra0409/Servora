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

export interface StaffSession {
  accessToken: string;
  branchId?: string;
  refreshToken: string;
  role: string;
  tenantId: string;
  userId: string;
}

export interface OrderLine {
  addonSnapshots: { label: string; priceDelta: number }[];
  menuItemId: string;
  name: string;
  notes?: string;
  quantity: number;
  unitPrice: number;
  variantLabel?: string;
}

export interface LiveOrder {
  _id?: string;
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  id?: string;
  items: OrderLine[];
  orderNo: string;
  status: string;
  submittedAt?: string;
  tableId: string;
}

export interface TableSummary {
  _id?: string;
  capacity: number;
  floorId: string;
  id?: string;
  qrToken?: string | null;
  status: string;
  tableNo: string;
}

export interface ServiceRequest {
  _id?: string;
  id?: string;
  message?: string;
  requestType: string;
  status: string;
  tableId: string;
  tableSessionId: string;
  createdAt?: string;
}

interface ApiOptions extends RequestInit {
  token?: string;
}

export const orderId = (order: LiveOrder): string => order.id ?? String(order._id ?? '');
export const documentId = (value: { _id?: unknown; id?: string }): string =>
  value.id ?? String(value._id ?? '');

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
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

export const login = (email: string, password: string, branchId?: string): Promise<StaffSession> =>
  apiRequest<StaffSession>('/auth/login', {
    body: JSON.stringify({ branchId: branchId || undefined, email, password }),
    method: 'POST',
  });

export const getLiveOrders = (branchId: string, token: string): Promise<LiveOrder[]> =>
  apiRequest<LiveOrder[]>(`/orders/live?branchId=${encodeURIComponent(branchId)}`, { token });

export const getTables = (branchId: string, token: string): Promise<TableSummary[]> =>
  apiRequest<TableSummary[]>(`/cms/tables?branchId=${encodeURIComponent(branchId)}`, { token });

export const getServiceRequests = (branchId: string, token: string): Promise<ServiceRequest[]> =>
  apiRequest<ServiceRequest[]>(`/service-requests?branchId=${encodeURIComponent(branchId)}`, { token });

export const resolveServiceRequest = (id: string, token: string): Promise<ServiceRequest> =>
  apiRequest<ServiceRequest>(`/service-requests/${id}/resolve`, { method: 'PATCH', token });

export const confirmOrder = (id: string, token: string): Promise<LiveOrder> =>
  apiRequest<LiveOrder>(`/orders/${id}/confirm`, { method: 'POST', token });

export const rejectOrder = (id: string, token: string): Promise<LiveOrder> =>
  apiRequest<LiveOrder>(`/orders/${id}/reject`, { method: 'POST', token });

export const updateOrderStatus = (id: string, status: string, token: string): Promise<LiveOrder> =>
  apiRequest<LiveOrder>(`/orders/${id}/status`, {
    body: JSON.stringify({ status }),
    method: 'PATCH',
    token,
  });
