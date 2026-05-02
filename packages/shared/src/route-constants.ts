export const API_PREFIX = '/api/v1';

export const CMS_ROUTES = {
  analytics: '/analytics',
  dashboard: '/dashboard',
  menuCategories: '/menu/categories',
  menuItems: '/menu/items',
  menuSchedules: '/menu/schedules',
  orders: '/orders',
  qr: '/qr',
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

