export const API_PREFIX = '/api/v1';

export const CMS_ROUTES = {
  analytics: '/analytics',
  auditLogs: '/audit-logs',
  bills: '/bills',
  branches: '/branches',
  dashboard: '/dashboard',
  floors: '/floors',
  kitchenBoard: '/kitchen-board',
  menuCategories: '/menu/categories',
  menuItems: '/menu/items',
  menuSchedules: '/menu/schedules',
  orders: '/orders',
  roles: '/staff/roles',
  serviceRequests: '/service-requests',
  settings: '/settings',
  staff: '/staff',
  subscription: '/subscription',
  tables: '/tables',
} as const;

export const CUSTOMER_ROUTES = {
  base: '/r/[tenantSlug]/[branchSlug]/t/[qrToken]',
  bill: 'bill',
  bucket: 'bucket',
  feedback: 'feedback',
  landing: '',
  menu: 'menu',
  service: 'service',
  status: 'status',
} as const;

