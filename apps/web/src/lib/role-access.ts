import { hasPermission, PERMISSIONS, type Permission, UserRole } from '@restaurent/shared';

export interface AppNavLink {
  href: string;
  icon: string;
  label: string;
  permissions: Permission[];
  roles?: UserRole[];
}

const platformRoles: UserRole[] = [UserRole.PlatformAdmin, UserRole.SuperAdmin];
const ownerRoles: UserRole[] = [UserRole.Owner];
const managerRoles: UserRole[] = [...ownerRoles, UserRole.Manager];
const waiterRoles: UserRole[] = [...ownerRoles, UserRole.Manager, UserRole.Waiter];
const staffRoles: UserRole[] = [UserRole.Owner, UserRole.Manager, UserRole.Waiter, UserRole.Kitchen, UserRole.Cashier];

export const appNavLinks: AppNavLink[] = [
  {
    href: '/super-admin',
    icon: 'dashboard',
    label: 'Dashboard',
    permissions: [PERMISSIONS.platformManage],
    roles: platformRoles,
  },
  {
    href: '/super-admin/tenants',
    icon: 'apartment',
    label: 'Tenants',
    permissions: [PERMISSIONS.platformManage],
    roles: platformRoles,
  },
  {
    href: '/super-admin/system-health',
    icon: 'monitor_heart',
    label: 'System Health',
    permissions: [PERMISSIONS.platformManage],
    roles: platformRoles,
  },
  {
    href: '/super-admin/subscriptions',
    icon: 'workspace_premium',
    label: 'Manage Subscription',
    permissions: [PERMISSIONS.platformManage],
    roles: platformRoles,
  },
  {
    href: '/super-admin/billing',
    icon: 'payments',
    label: 'Billing',
    permissions: [PERMISSIONS.platformManage],
    roles: platformRoles,
  },
  {
    href: '/super-admin/audit-logs',
    icon: 'manage_search',
    label: 'Audit Logs',
    permissions: [PERMISSIONS.platformManage],
    roles: platformRoles,
  },
  {
    href: '/super-admin/settings',
    icon: 'settings',
    label: 'Settings',
    permissions: [PERMISSIONS.platformManage],
    roles: platformRoles,
  },
  {
    href: '/dashboard',
    icon: 'dashboard',
    label: 'Dashboard',
    permissions: [],
    roles: [UserRole.Owner, UserRole.Manager, UserRole.Waiter, UserRole.Kitchen, UserRole.Cashier],
  },
  {
    href: '/orders',
    icon: 'receipt_long',
    label: 'Orders',
    permissions: [PERMISSIONS.orderRead],
    roles: [...managerRoles, UserRole.Waiter, UserRole.Cashier],
  },
  {
    href: '/kitchen-board',
    icon: 'soup_kitchen',
    label: 'Kitchen Board',
    permissions: [PERMISSIONS.kitchen],
    roles: [...ownerRoles, UserRole.Kitchen],
  },
  {
    href: '/bills',
    icon: 'payments',
    label: 'Bills',
    permissions: [PERMISSIONS.billing, PERMISSIONS.orderManage],
    roles: [...managerRoles, UserRole.Waiter, UserRole.Cashier],
  },
  { href: '/tables', icon: 'table_restaurant', label: 'Tables', permissions: [PERMISSIONS.tableManage], roles: waiterRoles },
  { href: '/floors', icon: 'layers', label: 'Floors', permissions: [PERMISSIONS.tableManage], roles: managerRoles },
  { href: '/qr', icon: 'qr_code_2', label: 'QR Codes', permissions: [PERMISSIONS.tableManage], roles: managerRoles },
  { href: '/menu/categories', icon: 'category', label: 'Categories', permissions: [PERMISSIONS.menuManage], roles: managerRoles },
  { href: '/menu/items', icon: 'menu_book', label: 'Menu Items', permissions: [PERMISSIONS.menuManage], roles: managerRoles },
  { href: '/menu/schedules', icon: 'event_available', label: 'Schedules', permissions: [PERMISSIONS.menuManage], roles: managerRoles },
  {
    href: '/service-requests',
    icon: 'notifications_active',
    label: 'Requests',
    permissions: [PERMISSIONS.serviceRequestManage],
    roles: waiterRoles,
  },
  { href: '/analytics', icon: 'monitoring', label: 'Analytics', permissions: [PERMISSIONS.analytics], roles: managerRoles },
  { href: '/staff', icon: 'groups', label: 'Staff', permissions: [PERMISSIONS.staffManage], roles: ownerRoles },
  { href: '/audit-logs', icon: 'manage_search', label: 'Audit Logs', permissions: [PERMISSIONS.staffManage], roles: ownerRoles },
  { href: '/subscription', icon: 'workspace_premium', label: 'Subscription', permissions: [PERMISSIONS.billing], roles: ownerRoles },
  { href: '/settings', icon: 'settings', label: 'Settings', permissions: [], roles: staffRoles },
];

export function isKnownRole(role: string): role is UserRole {
  return Object.values(UserRole).includes(role as UserRole);
}

export function canAccessPermissions(role: string, permissions: Permission[]): boolean {
  if (!isKnownRole(role)) {
    return false;
  }

  return permissions.length === 0 || permissions.some((permission) => hasPermission(role, permission));
}

function canAccessLink(role: string, link: AppNavLink): boolean {
  if (!isKnownRole(role)) {
    return false;
  }

  if (link.roles && !link.roles.includes(role)) {
    return false;
  }

  if (ownerRoles.includes(role)) {
    return true;
  }

  return canAccessPermissions(role, link.permissions);
}

export function linksForRole(role: string): AppNavLink[] {
  return appNavLinks.filter((link) => canAccessLink(role, link));
}

export function canAccessPath(role: string, pathname: string): boolean {
  const sortedLinks = [...appNavLinks].sort((first, second) => second.href.length - first.href.length);
  const link = sortedLinks.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  return link ? canAccessLink(role, link) : false;
}
