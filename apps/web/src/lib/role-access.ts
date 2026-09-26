import {
  isPlatformRoleKey,
  permissionsForBuiltinRole,
  SCREENS,
  expandPermissions,
  type ScreenGroup,
} from '@restaurent/shared';

export interface AppNavLink {
  group: ScreenGroup;
  href: string;
  icon: string;
  label: string;
  /** Registry screen key; the link shows when the user holds `<screen>:view`. */
  screen: string;
}

/**
 * Navigation is derived from the shared screen registry rather than a
 * hand-maintained list, so the sidebar always matches what the role builder
 * offers. The old `roles: UserRole[]` field is gone: a tenant-defined role is
 * not a `UserRole`, and gating on one made every custom role see an empty
 * sidebar.
 */
export const appNavLinks: AppNavLink[] = SCREENS.filter(
  (screen) => screen.href && !screen.platformOnly,
).map((screen) => ({
  group: screen.group,
  href: screen.href as string,
  icon: screen.icon,
  label: screen.label,
  screen: screen.key,
}));

/** Platform consoles are client-side only and never routed through tenant roles. */
export const platformNavLinks: AppNavLink[] = [
  { group: 'admin', href: '/super-admin', icon: 'dashboard', label: 'Dashboard', screen: 'platform' },
  { group: 'admin', href: '/super-admin/tenants', icon: 'apartment', label: 'Tenants', screen: 'platform' },
  { group: 'admin', href: '/super-admin/system-health', icon: 'monitor_heart', label: 'System Health', screen: 'platform' },
  { group: 'admin', href: '/super-admin/subscriptions', icon: 'workspace_premium', label: 'Manage Subscription', screen: 'platform' },
  { group: 'admin', href: '/super-admin/billing', icon: 'payments', label: 'Billing', screen: 'platform' },
  { group: 'admin', href: '/super-admin/audit-logs', icon: 'manage_search', label: 'Audit Logs', screen: 'platform' },
  { group: 'admin', href: '/super-admin/settings', icon: 'settings', label: 'Settings', screen: 'platform' },
];

export const viewPermission = (screen: string): string => `${screen}:view`;

export function linksForPermissions(permissions: ReadonlySet<string>, role: string): AppNavLink[] {
  if (isPlatformRoleKey(role)) {
    return platformNavLinks;
  }

  return appNavLinks.filter((link) => permissions.has(viewPermission(link.screen)));
}

export function canAccessPathWithPermissions(
  permissions: ReadonlySet<string>,
  role: string,
  pathname: string,
): boolean {
  const links = isPlatformRoleKey(role) ? platformNavLinks : appNavLinks;
  // Longest href first so `/staff/roles` resolves before `/staff`.
  const sorted = [...links].sort((first, second) => second.href.length - first.href.length);
  const link = sorted.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  if (!link) {
    return false;
  }

  return isPlatformRoleKey(role) || permissions.has(viewPermission(link.screen));
}

/**
 * Permissions for a role without a network call. Used for the first paint and
 * as the offline fallback; the server's `/auth/session` response is
 * authoritative and replaces this once it lands.
 */
export function fallbackPermissionsForRole(role: string): Set<string> {
  if (!role) {
    return new Set<string>();
  }

  return expandPermissions(permissionsForBuiltinRole(role));
}
