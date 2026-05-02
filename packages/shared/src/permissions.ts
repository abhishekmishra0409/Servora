import { UserRole } from './enums';

export const PERMISSIONS = {
  analytics: 'analytics.read',
  billing: 'billing.manage',
  kitchen: 'kitchen.manage',
  menuManage: 'menu.manage',
  menuRead: 'menu.read',
  orderManage: 'orders.manage',
  orderRead: 'orders.read',
  serviceRequestManage: 'service-requests.manage',
  settingsManage: 'settings.manage',
  staffManage: 'staff.manage',
  tableManage: 'tables.manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const rolePermissionMap: Record<UserRole, Permission[]> = {
  [UserRole.PlatformAdmin]: Object.values(PERMISSIONS),
  [UserRole.Owner]: Object.values(PERMISSIONS),
  [UserRole.Manager]: [
    PERMISSIONS.analytics,
    PERMISSIONS.menuManage,
    PERMISSIONS.orderManage,
    PERMISSIONS.orderRead,
    PERMISSIONS.serviceRequestManage,
    PERMISSIONS.tableManage,
  ],
  [UserRole.Waiter]: [
    PERMISSIONS.orderRead,
    PERMISSIONS.orderManage,
    PERMISSIONS.serviceRequestManage,
    PERMISSIONS.tableManage,
  ],
  [UserRole.Kitchen]: [PERMISSIONS.kitchen, PERMISSIONS.orderRead, PERMISSIONS.orderManage],
  [UserRole.Cashier]: [PERMISSIONS.billing, PERMISSIONS.orderRead],
  [UserRole.Customer]: [PERMISSIONS.menuRead],
};

export const hasPermission = (role: UserRole, permission: Permission): boolean =>
  rolePermissionMap[role].includes(permission);

