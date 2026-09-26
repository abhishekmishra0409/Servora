import type {
  BranchServiceMode,
  OrderStatus,
  PaymentStatus,
  ServiceRequestStatus,
  SubscriptionStatus,
  TableStatus,
} from './enums';
import type { MenuItem, MenuCategory } from './menu-types';
import type { RoleKey } from './screen-permissions';

export interface TenantSummary {
  id: string;
  legalName: string;
  slug: string;
  status: SubscriptionStatus;
}

export interface BranchSummary {
  id: string;
  branchId: string;
  name: string;
  serviceMode: BranchServiceMode;
  slug: string;
  tenantId: string;
}

export interface StaffSession {
  accessToken: string;
  branchId?: string;
  /** Effective permissions for this session, so the CMS can render nav on first paint. */
  permissions?: string[];
  refreshToken: string;
  role: RoleKey;
  tenantId: string;
  userId: string;
}

export interface GuestSession {
  alias: string;
  guestToken: string;
  participantId: string;
  tableSessionId: string;
}

export interface TableSummary {
  branchId: string;
  id: string;
  floorId: string;
  qrToken: string;
  status: TableStatus;
  tableNo: string;
  tenantId: string;
}

export interface OrderSummary {
  branchId: string;
  grandTotal: number;
  id: string;
  orderNo: string;
  status: OrderStatus;
  tableId: string;
  tenantId: string;
}

export interface ServiceRequestSummary {
  id: string;
  requestType: string;
  status: ServiceRequestStatus;
  tableId: string;
  tenantId: string;
}

export interface PaymentSummary {
  amount: number;
  id: string;
  provider: 'stripe' | 'offline';
  status: PaymentStatus;
}

export interface AnalyticsOverview {
  activeSessions: number;
  avgBasket: number;
  liveOrders: number;
  serviceRequestsOpen: number;
  todayRevenue: number;
}

export interface MenuResponse {
  categories: MenuCategory[];
  items: MenuItem[];
}
