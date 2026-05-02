import type { MenuResponse } from '@restaurent/shared';

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
const normalizeLocalUrl = (value: string): string => {
  if (typeof window === 'undefined') {
    return value;
  }

  const url = new URL(value);
  if (['localhost', '127.0.0.1', '::1'].includes(url.hostname) && !['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)) {
    url.hostname = window.location.hostname;
  }

  return url.toString().replace(/\/$/, '');
};
const apiUrl = configuredApiUrl ? normalizeLocalUrl(configuredApiUrl) : '';
const API_BASE_URL = apiUrl ? (apiUrl.endsWith('/api/v1') ? apiUrl : `${apiUrl}/api/v1`) : '/api/v1';

export interface BucketItem {
  addons: { id: string; label: string; priceDelta: number }[];
  addedByParticipantId: string;
  id: string;
  menuItemId: string;
  name: string;
  notes?: string;
  price: number;
  quantity: number;
  variantId?: string;
  variantLabel?: string;
  variantPriceDelta?: number;
}

export interface BucketSnapshot {
  items: BucketItem[];
  state: 'open' | 'locked';
  totals: {
    grandTotal: number;
    subtotal: number;
    taxTotal: number;
  };
  version: number;
}

export interface TableContext {
  branch: {
    id: string;
    name: string;
    serviceMode: string;
    slug: string;
  };
  qr: {
    id: string;
    token: string;
    version: number;
  };
  table: {
    capacity: number;
    id: string;
    status: string;
    tableNo: string;
  };
  tableSession: {
    bucket: BucketSnapshot;
    id: string;
    openedAt: string;
    participants: { active: boolean; alias: string; id: string; joinedAt: string }[];
    status: string;
  } | null;
  tenant: {
    id: string;
    legalName: string;
    slug: string;
  };
}

export interface GuestSession {
  alias: string;
  guestToken: string;
  participantId: string;
  tableSessionId: string;
}

export interface SubmittedOrder {
  orderId: string;
  orderNo: string;
  status: string;
  submittedAt?: string;
}

export interface OrderStatusSnapshot {
  grandTotal: number;
  id: string;
  items: {
    addonSnapshots: { label: string; priceDelta: number }[];
    menuItemId: string;
    name: string;
    notes?: string;
    quantity: number;
    unitPrice: number;
    variantLabel?: string;
  }[];
  orderNo: string;
  status: string;
  submittedAt: string;
}

export interface LiveOrder {
  _id?: string;
  grandTotal: number;
  id?: string;
  items: OrderStatusSnapshot['items'];
  orderNo: string;
  status: string;
  submittedAt?: string;
  tableId: string;
}

export interface StaffSession {
  accessToken: string;
  branchId?: string;
  refreshToken: string;
  role: string;
  tenantId: string;
  userId: string;
}

export interface CmsMenuItem {
  _id?: string;
  available: boolean;
  categoryId: string;
  description: string;
  dietaryFlags: string[];
  id?: string;
  media?: { alt?: string; url?: string } | Record<string, unknown>;
  name: string;
  price: number;
  schedules?: { days: string[]; endTime: string; startTime: string }[];
  slug: string;
}

export interface CmsMenuCategory {
  _id?: string;
  branchId?: string;
  id?: string;
  name: string;
  sortOrder: number;
  subcategories: { id: string; name: string; sortOrder: number; visible: boolean }[];
  tenantId: string;
  visible: boolean;
}

export interface CmsTable {
  activeOrderCount?: number;
  _id?: string;
  capacity: number;
  floorId?: string;
  id?: string;
  qrToken?: string | null;
  status: string;
  tableNo: string;
}

export interface CmsServiceRequest {
  _id?: string;
  assignedUserId?: string;
  createdAt?: string;
  id?: string;
  message?: string;
  requestType: string;
  status: string;
  tableId: string;
}

export interface CmsStaffMember {
  active: boolean;
  email: string;
  id: string;
  lastActive?: string;
  name: string;
  role: string;
}

export interface CmsAnalyticsOverview {
  activeSessions: number;
  avgBasket: number;
  liveOrders: number;
  serviceRequestsOpen: number;
  todayRevenue: number;
}

export interface CmsTenant {
  _id?: string;
  defaultCurrency: string;
  defaultTimezone: string;
  id?: string;
  legalName: string;
  slug: string;
  status: string;
}

export interface CmsBranch {
  _id?: string;
  address: Record<string, unknown>;
  hours: Record<string, unknown>;
  id?: string;
  name: string;
  serviceMode: string;
  slug: string;
  tenantId: string;
}

export interface CmsBillingSummary {
  plan: { active: boolean; code: string; monthlyPrice: number; name: string } | null;
  subscription: { planCode: string; provider: string; renewsAt?: string; status: string; tenantId: string } | null;
}

interface ApiOptions extends RequestInit {
  token?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
  const payload = (await response.json().catch(() => null)) as { message?: string } | T | null;

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload && payload.message
        ? payload.message
        : 'Request failed';
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

export const getTableContext = (qrToken: string, options: ApiOptions = {}): Promise<TableContext> =>
  apiRequest<TableContext>(`/public/table-context?qrToken=${encodeURIComponent(qrToken)}`, options);

export const joinTable = (qrToken: string, alias: string): Promise<GuestSession> =>
  apiRequest<GuestSession>('/table-sessions/join', {
    body: JSON.stringify({ alias, qrToken }),
    method: 'POST',
  });

export const getPublicMenu = (tenantId: string, branchId: string): Promise<MenuResponse> =>
  apiRequest<MenuResponse>(
    `/menu?tenantId=${encodeURIComponent(tenantId)}&branchId=${encodeURIComponent(branchId)}`,
  );

export const addBucketItem = (
  tableSessionId: string,
  token: string,
  body: unknown,
): Promise<TableContext['tableSession']> =>
  apiRequest<TableContext['tableSession']>(`/buckets/${tableSessionId}/items`, {
    body: JSON.stringify(body),
    method: 'POST',
    token,
  });

export const updateBucketItem = (
  tableSessionId: string,
  itemId: string,
  token: string,
  body: unknown,
): Promise<TableContext['tableSession']> =>
  apiRequest<TableContext['tableSession']>(`/buckets/${tableSessionId}/items/${itemId}`, {
    body: JSON.stringify(body),
    method: 'PATCH',
    token,
  });

export const removeBucketItem = (
  tableSessionId: string,
  itemId: string,
  token: string,
): Promise<TableContext['tableSession']> =>
  apiRequest<TableContext['tableSession']>(`/buckets/${tableSessionId}/items/${itemId}`, {
    method: 'DELETE',
    token,
  });

export const submitBucket = (
  tableSessionId: string,
  token: string,
  idempotencyKey: string,
): Promise<SubmittedOrder> =>
  apiRequest<SubmittedOrder>(`/buckets/${tableSessionId}/submit`, {
    body: JSON.stringify({ paymentMethod: 'pay_later' }),
    headers: { 'Idempotency-Key': idempotencyKey },
    method: 'POST',
    token,
  });

export const getOrderStatus = (orderId: string, qrToken: string): Promise<OrderStatusSnapshot> =>
  apiRequest<OrderStatusSnapshot>(
    `/public/orders/${encodeURIComponent(orderId)}/status?qrToken=${encodeURIComponent(qrToken)}`,
  );

export const getPublicOrders = (qrToken: string): Promise<OrderStatusSnapshot[]> =>
  apiRequest<OrderStatusSnapshot[]>(`/public/orders?qrToken=${encodeURIComponent(qrToken)}`);

export const createServiceRequest = (token: string, body: { message?: string; requestType: string }): Promise<CmsServiceRequest> =>
  apiRequest<CmsServiceRequest>('/service-requests', {
    body: JSON.stringify(body),
    method: 'POST',
    token,
  });

export const loginStaff = (email: string, password: string, branchId?: string): Promise<StaffSession> =>
  apiRequest<StaffSession>('/auth/login', {
    body: JSON.stringify({ branchId: branchId || undefined, email, password }),
    method: 'POST',
  });

export const getLiveOrders = (branchId: string, token: string): Promise<LiveOrder[]> =>
  apiRequest<LiveOrder[]>(`/orders/live?branchId=${encodeURIComponent(branchId)}`, { token });

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

export const getCmsMenuItems = (branchId: string, token: string): Promise<CmsMenuItem[]> =>
  apiRequest<CmsMenuItem[]>(`/cms/menu/items?branchId=${encodeURIComponent(branchId)}`, { token });

export const createCmsMenuItem = (body: Partial<CmsMenuItem>, token: string): Promise<CmsMenuItem> =>
  apiRequest<CmsMenuItem>('/cms/menu/items', {
    body: JSON.stringify(body),
    method: 'POST',
    token,
  });

export const updateCmsMenuItem = (id: string, body: Partial<CmsMenuItem>, token: string): Promise<CmsMenuItem> =>
  apiRequest<CmsMenuItem>(`/cms/menu/items/${id}`, {
    body: JSON.stringify(body),
    method: 'PATCH',
    token,
  });

export const deleteCmsMenuItem = (id: string, token: string): Promise<{ success: boolean }> =>
  apiRequest<{ success: boolean }>(`/cms/menu/items/${id}`, { method: 'DELETE', token });

export const getCmsMenuCategories = (tenantId: string, branchId: string): Promise<CmsMenuCategory[]> =>
  apiRequest<CmsMenuCategory[]>(
    `/menu/categories?tenantId=${encodeURIComponent(tenantId)}&branchId=${encodeURIComponent(branchId)}`,
  );

export const createCmsMenuCategory = (
  body: { branchId: string; name: string; sortOrder?: number; tenantId: string },
  token: string,
): Promise<CmsMenuCategory> =>
  apiRequest<CmsMenuCategory>('/cms/menu/categories', {
    body: JSON.stringify(body),
    method: 'POST',
    token,
  });

export const updateCmsMenuCategory = (
  id: string,
  body: Partial<Pick<CmsMenuCategory, 'name' | 'sortOrder' | 'subcategories'>>,
  token: string,
): Promise<CmsMenuCategory> =>
  apiRequest<CmsMenuCategory>(`/cms/menu/categories/${id}`, {
    body: JSON.stringify(body),
    method: 'PATCH',
    token,
  });

export const deleteCmsMenuCategory = (id: string, token: string): Promise<{ success: boolean }> =>
  apiRequest<{ success: boolean }>(`/cms/menu/categories/${id}`, { method: 'DELETE', token });

export const getCmsTables = (branchId: string, token: string): Promise<CmsTable[]> =>
  apiRequest<CmsTable[]>(`/cms/tables?branchId=${encodeURIComponent(branchId)}`, { token });

export const createCmsTable = (
  body: { branchId: string; capacity: number; floorId: string; tableNo: string; tenantId: string },
  token: string,
): Promise<CmsTable> =>
  apiRequest<CmsTable>('/cms/tables', {
    body: JSON.stringify(body),
    method: 'POST',
    token,
  });

export const updateCmsTable = (
  id: string,
  body: Partial<Pick<CmsTable, 'capacity' | 'floorId' | 'tableNo'>>,
  token: string,
): Promise<CmsTable> =>
  apiRequest<CmsTable>(`/cms/tables/${id}`, {
    body: JSON.stringify(body),
    method: 'PATCH',
    token,
  });

export const deleteCmsTable = (id: string, token: string): Promise<{ success: boolean }> =>
  apiRequest<{ success: boolean }>(`/cms/tables/${id}`, { method: 'DELETE', token });

export const regenerateCmsQr = (tableId: string, token: string): Promise<{ token: string; version: number }> =>
  apiRequest<{ token: string; version: number }>('/cms/qr/regenerate', {
    body: JSON.stringify({ tableId }),
    method: 'POST',
    token,
  });

export const getCmsServiceRequests = (branchId: string, token: string): Promise<CmsServiceRequest[]> =>
  apiRequest<CmsServiceRequest[]>(`/service-requests?branchId=${encodeURIComponent(branchId)}`, { token });

export const getCmsStaff = (branchId: string, token: string): Promise<CmsStaffMember[]> =>
  apiRequest<CmsStaffMember[]>(`/cms/staff?branchId=${encodeURIComponent(branchId)}`, { token });

export const createCmsStaff = (
  body: { branchId: string; email: string; name: string; password: string; role: string; tenantId: string },
  token: string,
): Promise<CmsStaffMember> =>
  apiRequest<CmsStaffMember>('/cms/staff', {
    body: JSON.stringify(body),
    method: 'POST',
    token,
  });

export const updateCmsStaff = (
  id: string,
  body: Partial<Pick<CmsStaffMember, 'active' | 'name' | 'role'>>,
  token: string,
): Promise<CmsStaffMember> =>
  apiRequest<CmsStaffMember>(`/cms/staff/${id}`, {
    body: JSON.stringify(body),
    method: 'PATCH',
    token,
  });

export const deleteCmsStaff = (id: string, token: string): Promise<{ success: boolean }> =>
  apiRequest<{ success: boolean }>(`/cms/staff/${id}`, { method: 'DELETE', token });

export const getCmsAnalyticsOverview = (branchId: string, token: string): Promise<CmsAnalyticsOverview> =>
  apiRequest<CmsAnalyticsOverview>(`/analytics/overview?branchId=${encodeURIComponent(branchId)}`, { token });

export const getCmsAnalyticsMenu = (
  branchId: string,
  token: string,
): Promise<{ itemCount: number; items: { available: boolean; name: string; price: number }[] }> =>
  apiRequest<{ itemCount: number; items: { available: boolean; name: string; price: number }[] }>(
    `/analytics/menu?branchId=${encodeURIComponent(branchId)}`,
    { token },
  );

export const getCmsTenants = (token: string): Promise<CmsTenant[]> =>
  apiRequest<CmsTenant[]>('/tenants', { token });

export const getCmsBranches = (tenantId: string, token: string): Promise<CmsBranch[]> =>
  apiRequest<CmsBranch[]>(`/branches?tenantId=${encodeURIComponent(tenantId)}`, { token });

export const updateCmsBranch = (id: string, body: Partial<CmsBranch>, token: string): Promise<CmsBranch> =>
  apiRequest<CmsBranch>(`/branches/${id}`, {
    body: JSON.stringify(body),
    method: 'PATCH',
    token,
  });

export const getCmsBillingSummary = (tenantId: string, token: string): Promise<CmsBillingSummary> =>
  apiRequest<CmsBillingSummary>(`/billing/summary?tenantId=${encodeURIComponent(tenantId)}`, { token });

export const documentId = (value: { _id?: unknown; id?: string }): string =>
  value.id ?? String(value._id ?? '');
