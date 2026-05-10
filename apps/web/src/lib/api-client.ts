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
const cmsTokenKey = 'restaurent:cms:accessToken';
const cmsRefreshTokenKey = 'restaurent:cms:refreshToken';

const makeIdempotencyKey = (scope: string): string => {
  const randomValue =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${scope}:${randomValue}`;
};

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
  enabledFeatures?: string[];
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
  paymentRequired?: boolean;
  plan: CmsSubscriptionPlan | null;
  plans?: CmsSubscriptionPlan[];
  subscription: { planCode: string; provider: string; renewsAt?: string; status: string; tenantId: string } | null;
}

export interface CmsSubscriptionPlan {
  _id?: string;
  active: boolean;
  badge?: string;
  branchLimit?: number;
  code: string;
  currency?: string;
  description?: string;
  employeeLimit?: number;
  id?: string;
  interval?: string;
  monthlyBillLimit?: number;
  monthlyPrice: number;
  name: string;
  perks?: string[];
  sortOrder?: number;
  stripePriceId?: string;
  stripeProductId?: string;
  tableLimit?: number;
  visible?: boolean;
}

export interface CmsSuperAdminSubscription {
  _id?: string;
  id?: string;
  planCode: string;
  provider: string;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  renewsAt?: string;
  status: string;
  tenantId: string;
  trialEndsAt?: string;
}

export interface CmsSuperAdminTenantSummary {
  plan: CmsSubscriptionPlan | null;
  subscription: CmsSuperAdminSubscription | null;
  tenant: CmsTenant & { createdAt?: string; updatedAt?: string };
}

export interface CmsSuperAdminTenantBusiness {
  annualizedRevenue: number;
  auditEntryCount: number;
  branchCount: number;
  currentMrr: number;
  employeeCount: number;
  enabledFeatureCount: number;
  lifetimeValue: number;
  planName: string;
  renewsAt?: string;
  restaurantAverageOrderValue: number;
  restaurantOrderCount: number;
  restaurantRevenue: number;
  restaurantRevenueThisMonth: number;
  restaurantThisMonthOrderCount: number;
  subscriptionStatus: string;
}

export interface CmsSuperAdminTenantEmployee {
  active: boolean;
  branchId?: string;
  branchName: string;
  email: string;
  id: string;
  lastActive?: string;
  name: string;
  role: string;
  userId: string;
}

export interface CmsSuperAdminTenantDetail extends CmsSuperAdminTenantSummary {
  auditLogPagination?: {
    limit: number;
    page: number;
    total: number;
    totalPages: number;
  };
  auditLogs?: CmsAuditLog[];
  branches?: CmsBranch[];
  business?: CmsSuperAdminTenantBusiness;
  employees?: CmsSuperAdminTenantEmployee[];
}

export interface CmsFloor {
  _id?: string;
  branchId: string;
  id?: string;
  name: string;
  sortOrder: number;
  tenantId: string;
}

export interface CmsAuditLog {
  _id?: string;
  action: string;
  actorUserId?: string;
  branchId?: string;
  createdAt?: string;
  entityId: string;
  entityType: string;
  payload: Record<string, unknown>;
  tenantId: string;
}

export interface PaymentSnapshot {
  _id?: string;
  amount: number;
  currency: string;
  id?: string;
  method: string;
  orderId: string;
  provider: string;
  status: string;
}

export interface MediaUploadSignature {
  apiKey: string;
  cloudName: string;
  folder: string;
  signature: string;
  timestamp: number;
}

interface ApiOptions extends RequestInit {
  token?: string;
}

let refreshPromise: Promise<string | null> | null = null;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const storedCmsToken = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.localStorage.getItem(cmsTokenKey) ?? '';
};

const clearCmsAuth = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(cmsTokenKey);
  window.localStorage.removeItem(cmsRefreshTokenKey);
  window.localStorage.removeItem('restaurent:cms:branchId');
  window.localStorage.removeItem('restaurent:cms:role');
  window.localStorage.removeItem('restaurent:cms:tenantId');
  window.localStorage.removeItem('restaurent:cms:userId');
};

async function refreshCmsAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = window.localStorage.getItem(cmsRefreshTokenKey);
      if (!refreshToken) {
        return null;
      }

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        body: JSON.stringify({ refreshToken }),
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });
      const payload = (await response.json().catch(() => null)) as
        | { accessToken?: string; refreshToken?: string }
        | null;

      if (!response.ok || !payload?.accessToken || !payload.refreshToken) {
        clearCmsAuth();
        return null;
      }

      window.localStorage.setItem(cmsTokenKey, payload.accessToken);
      window.localStorage.setItem(cmsRefreshTokenKey, payload.refreshToken);
      return payload.accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function readJsonResponse<T>(response: Response): Promise<T> {
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

function requestHeaders(options: ApiOptions, tokenOverride?: string): Headers {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const authToken = tokenOverride ?? (options.token ? storedCmsToken() || options.token : '');
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  return headers;
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: requestHeaders(options),
  });

  if (response.status === 401 && options.token) {
    const nextToken = await refreshCmsAccessToken();
    if (nextToken) {
      const retryResponse = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: requestHeaders(options, nextToken),
      });
      return readJsonResponse<T>(retryResponse);
    }

    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
  }

  return readJsonResponse<T>(response);
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

export const getPublicOrderPayment = (orderId: string, qrToken: string): Promise<PaymentSnapshot | null> =>
  apiRequest<PaymentSnapshot | null>(
    `/public/orders/${encodeURIComponent(orderId)}/payment?qrToken=${encodeURIComponent(qrToken)}`,
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

export const changeCmsPassword = (
  currentPassword: string,
  newPassword: string,
  token: string,
): Promise<{ success: boolean }> =>
  apiRequest<{ success: boolean }>('/auth/change-password', {
    body: JSON.stringify({ currentPassword, newPassword }),
    method: 'POST',
    token,
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

export const requestBill = (orderId: string, token: string): Promise<PaymentSnapshot> =>
  apiRequest<PaymentSnapshot>(`/orders/${orderId}/bill-request`, { method: 'POST', token });

export const createPaymentCheckoutSession = (
  orderId: string,
  provider: string,
  token: string,
): Promise<{ paymentId: string; provider: string; url: string }> =>
  apiRequest<{ paymentId: string; provider: string; url: string }>('/payments/checkout-session', {
    body: JSON.stringify({ orderId, provider }),
    method: 'POST',
    token,
  });

export const getPayment = (paymentId: string, token: string): Promise<PaymentSnapshot> =>
  apiRequest<PaymentSnapshot>(`/payments/${paymentId}`, { token });

export const markCashPaid = (paymentId: string, token: string): Promise<PaymentSnapshot> =>
  apiRequest<PaymentSnapshot>(`/payments/${paymentId}/mark-cash-paid`, { method: 'POST', token });

export const signMediaUpload = (token: string, folder?: string): Promise<MediaUploadSignature> =>
  apiRequest<MediaUploadSignature>('/media/sign-upload', {
    body: JSON.stringify({ folder }),
    method: 'POST',
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

export const resolveServiceRequest = (id: string, token: string): Promise<CmsServiceRequest> =>
  apiRequest<CmsServiceRequest>(`/service-requests/${id}/resolve`, { method: 'PATCH', token });

export const getCmsFloors = (branchId: string, token: string): Promise<CmsFloor[]> =>
  apiRequest<CmsFloor[]>(`/cms/floors?branchId=${encodeURIComponent(branchId)}`, { token });

export const createCmsFloor = (
  body: { branchId: string; name: string; sortOrder?: number; tenantId: string },
  token: string,
): Promise<CmsFloor> =>
  apiRequest<CmsFloor>('/cms/floors', {
    body: JSON.stringify(body),
    method: 'POST',
    token,
  });

export const updateCmsFloor = (id: string, body: Partial<Pick<CmsFloor, 'name' | 'sortOrder'>>, token: string): Promise<CmsFloor> =>
  apiRequest<CmsFloor>(`/cms/floors/${id}`, {
    body: JSON.stringify(body),
    method: 'PATCH',
    token,
  });

export const deleteCmsFloor = (id: string, token: string): Promise<{ success: boolean }> =>
  apiRequest<{ success: boolean }>(`/cms/floors/${id}`, { method: 'DELETE', token });

export const getCmsAuditLogs = (tenantId: string, branchId: string, token: string): Promise<CmsAuditLog[]> =>
  apiRequest<CmsAuditLog[]>(
    `/cms/audit-logs?tenantId=${encodeURIComponent(tenantId)}&branchId=${encodeURIComponent(branchId)}`,
    { token },
  );

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

export const getBillingPlans = (token: string): Promise<CmsSubscriptionPlan[]> =>
  apiRequest<CmsSubscriptionPlan[]>('/billing/plans', { token });

export const createBillingCheckoutSession = (
  tenantId: string,
  planCode: string,
  token: string,
): Promise<{ provider: string; url: string }> =>
  apiRequest<{ provider: string; url: string }>('/billing/checkout-session', {
    body: JSON.stringify({ planCode, tenantId }),
    headers: { 'Idempotency-Key': makeIdempotencyKey(`billing-checkout:${tenantId}:${planCode}`) },
    method: 'POST',
    token,
  });

export const createBillingCustomerPortal = (
  tenantId: string,
  token: string,
): Promise<{ provider: string; url: string }> =>
  apiRequest<{ provider: string; url: string }>('/billing/customer-portal', {
    body: JSON.stringify({ tenantId }),
    method: 'POST',
    token,
  });

export const getSuperAdminTenants = (token: string): Promise<CmsSuperAdminTenantSummary[]> =>
  apiRequest<CmsSuperAdminTenantSummary[]>('/super-admin/tenants', { token });

export const createSuperAdminTenant = (
  body: {
    defaultCurrency?: string;
    defaultTimezone?: string;
    enabledFeatures?: string[];
    legalName: string;
    ownerEmail: string;
    ownerName?: string;
    ownerPassword: string;
    slug?: string;
    status?: string;
  },
  token: string,
): Promise<CmsSuperAdminTenantDetail> =>
  apiRequest<CmsSuperAdminTenantDetail>('/super-admin/tenants', {
    body: JSON.stringify(body),
    method: 'POST',
    token,
  });

export const getSuperAdminTenant = (
  id: string,
  token: string,
  options: { auditLimit?: number; auditPage?: number } = {},
): Promise<CmsSuperAdminTenantDetail> => {
  const query = new URLSearchParams();
  if (options.auditLimit) query.set('auditLimit', String(options.auditLimit));
  if (options.auditPage) query.set('auditPage', String(options.auditPage));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<CmsSuperAdminTenantDetail>(`/super-admin/tenants/${encodeURIComponent(id)}${suffix}`, { token });
};

export const updateSuperAdminTenant = (
  id: string,
  body: Partial<Pick<CmsTenant, 'defaultCurrency' | 'defaultTimezone' | 'legalName' | 'slug' | 'status'>>,
  token: string,
): Promise<CmsSuperAdminTenantDetail> =>
  apiRequest<CmsSuperAdminTenantDetail>(`/super-admin/tenants/${encodeURIComponent(id)}`, {
    body: JSON.stringify(body),
    method: 'PATCH',
    token,
  });

export const getSuperAdminPlans = (token: string): Promise<CmsSubscriptionPlan[]> =>
  apiRequest<CmsSubscriptionPlan[]>('/super-admin/plans', { token });

export const updateSuperAdminPlanSettings = (
  code: string,
  body: Partial<Pick<
    CmsSubscriptionPlan,
    'badge' | 'branchLimit' | 'description' | 'employeeLimit' | 'monthlyBillLimit' | 'perks' | 'sortOrder' | 'tableLimit' | 'visible'
  >>,
  token: string,
): Promise<CmsSubscriptionPlan> =>
  apiRequest<CmsSubscriptionPlan>(`/super-admin/plans/${encodeURIComponent(code)}/settings`, {
    body: JSON.stringify(body),
    method: 'PATCH',
    token,
  });

export const updateSuperAdminTenantStatus = (
  id: string,
  status: string,
  token: string,
): Promise<CmsSuperAdminTenantDetail> =>
  apiRequest<CmsSuperAdminTenantDetail>(`/super-admin/tenants/${encodeURIComponent(id)}/status`, {
    body: JSON.stringify({ status }),
    method: 'PATCH',
    token,
  });

export const updateSuperAdminTenantFeatures = (
  id: string,
  enabledFeatures: string[],
  token: string,
): Promise<CmsSuperAdminTenantDetail> =>
  apiRequest<CmsSuperAdminTenantDetail>(`/super-admin/tenants/${encodeURIComponent(id)}/features`, {
    body: JSON.stringify({ enabledFeatures }),
    method: 'PATCH',
    token,
  });

export const documentId = (value: { _id?: unknown; id?: string }): string =>
  value.id ?? String(value._id ?? '');
