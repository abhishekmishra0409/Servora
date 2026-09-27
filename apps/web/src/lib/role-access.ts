import {
  isPlatformRoleKey,
  permissionsForBuiltinRole,
  SCREEN_GROUPS,
  SCREENS,
  expandPermissions,
} from '@restaurent/shared';

export interface NavGroup {
  key: string;
  label: string;
}

export interface AppNavLink {
  /** Sidebar category key; see `navGroupsFor`. */
  group: string;
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

/** Categories for the platform console, in display order. */
export const PLATFORM_NAV_GROUPS: NavGroup[] = [
  { key: 'platform-overview', label: 'Overview' },
  { key: 'platform-tenants', label: 'Tenants & billing' },
  { key: 'platform-system', label: 'System' },
];

/** Platform consoles are client-side only and never routed through tenant roles. */
export const platformNavLinks: AppNavLink[] = [
  { group: 'platform-overview', href: '/super-admin', icon: 'dashboard', label: 'Dashboard', screen: 'platform' },
  { group: 'platform-overview', href: '/super-admin/system-health', icon: 'monitor_heart', label: 'System Health', screen: 'platform' },
  { group: 'platform-tenants', href: '/super-admin/tenants', icon: 'apartment', label: 'Tenants', screen: 'platform' },
  { group: 'platform-tenants', href: '/super-admin/subscriptions', icon: 'workspace_premium', label: 'Subscription plans', screen: 'platform' },
  { group: 'platform-tenants', href: '/super-admin/billing', icon: 'payments', label: 'Billing', screen: 'platform' },
  { group: 'platform-system', href: '/super-admin/audit-logs', icon: 'manage_search', label: 'Audit Logs', screen: 'platform' },
  { group: 'platform-system', href: '/super-admin/settings', icon: 'settings', label: 'Settings', screen: 'platform' },
];

export const navGroupsFor = (role: string): NavGroup[] =>
  isPlatformRoleKey(role) ? PLATFORM_NAV_GROUPS : SCREEN_GROUPS;

export interface NavSection extends NavGroup {
  links: AppNavLink[];
}

/**
 * Buckets visible links into their categories, in category order, dropping
 * categories the user has nothing to open in. A link whose group is unknown
 * falls into a trailing "More" section rather than disappearing.
 */
export function groupNavLinks(links: AppNavLink[], groups: NavGroup[]): NavSection[] {
  const known = new Set(groups.map((group) => group.key));
  const sections: NavSection[] = groups.map((group) => ({
    ...group,
    links: links.filter((link) => link.group === group.key),
  }));
  const strays = links.filter((link) => !known.has(link.group));

  if (strays.length > 0) {
    sections.push({ key: 'more', label: 'More', links: strays });
  }

  return sections.filter((section) => section.links.length > 0);
}

export const viewPermission = (screen: string): string => `${screen}:view`;

/** Screens that a plan feature flag can switch off for a whole tenant. */
const FEATURE_GATED_SCREENS: Record<string, string> = {
  analytics: 'analytics',
  'audit-logs': 'audit_logs',
};

/**
 * Drops links whose plan feature is disabled. `features` is null while the
 * entitlements are unknown (platform staff, or before the session loads), in
 * which case nothing is hidden — the API still enforces the flag.
 */
export function filterLinksByFeatures(links: AppNavLink[], features: readonly string[] | null): AppNavLink[] {
  if (!features) {
    return links;
  }

  return links.filter((link) => {
    const feature = FEATURE_GATED_SCREENS[link.screen];
    return !feature || features.includes(feature);
  });
}

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
