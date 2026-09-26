import { UserRole } from './enums';

/**
 * Screen-and-action permission registry.
 *
 * One source of truth for three consumers: the API's PermissionsGuard, the CMS
 * navigation, and the tenant-facing role builder. A permission string is
 * `<screenKey>:<action>` — the colon keeps it unambiguous against the legacy
 * dotted strings in `permissions.ts`, so both vocabularies can coexist while
 * the migration lands.
 */

export const SCREEN_ACTIONS = ['view', 'add', 'edit', 'delete'] as const;
export type ScreenAction = (typeof SCREEN_ACTIONS)[number];

export const ACTION_LABELS: Record<ScreenAction, string> = {
  add: 'Add',
  delete: 'Delete',
  edit: 'Edit',
  view: 'View',
};

export type ScreenGroup = 'operations' | 'menu' | 'admin';

export const SCREEN_GROUPS: { key: ScreenGroup; label: string }[] = [
  { key: 'operations', label: 'Operations' },
  { key: 'menu', label: 'Menu' },
  { key: 'admin', label: 'Administration' },
];

export interface ScreenAdvancedAction {
  description?: string;
  key: string;
  label: string;
}

export interface ScreenDefinition {
  /** Only the CRUD actions that a real endpoint backs. Others render as "—". */
  actions: ScreenAction[];
  advanced?: ScreenAdvancedAction[];
  group: ScreenGroup;
  /** Material Symbols icon name. */
  icon: string;
  key: string;
  label: string;
  /** View is always granted so every role keeps a usable landing page. */
  locked?: boolean;
  /** Platform-only screens are never offered in the tenant role builder. */
  platformOnly?: boolean;
  href?: string;
}

export const SCREENS: ScreenDefinition[] = [
  {
    actions: ['view'],
    group: 'operations',
    href: '/dashboard',
    icon: 'dashboard',
    key: 'dashboard',
    label: 'Dashboard',
    locked: true,
  },
  {
    actions: ['view', 'edit'],
    advanced: [
      { key: 'confirm', label: 'Confirm orders' },
      { key: 'reject', label: 'Reject orders' },
      { key: 'status-preparing', label: 'Move to preparing' },
      { key: 'status-ready', label: 'Move to ready' },
      { key: 'status-served', label: 'Mark served' },
    ],
    group: 'operations',
    href: '/orders',
    icon: 'receipt_long',
    key: 'orders',
    label: 'Orders',
  },
  {
    actions: ['view', 'edit'],
    advanced: [
      { key: 'status-preparing', label: 'Move to preparing' },
      { key: 'status-ready', label: 'Move to ready' },
    ],
    group: 'operations',
    href: '/kitchen-board',
    icon: 'skillet',
    key: 'kitchen',
    label: 'Kitchen Board',
  },
  {
    actions: ['view'],
    advanced: [
      { key: 'request', label: 'Request a bill' },
      { key: 'mark-paid', label: 'Mark as paid' },
      { key: 'mark-cash-paid', label: 'Take cash payment' },
      { key: 'checkout', label: 'Create card checkout' },
    ],
    group: 'operations',
    href: '/bills',
    icon: 'payments',
    key: 'bills',
    label: 'Bills',
  },
  {
    actions: ['view', 'add', 'edit', 'delete'],
    advanced: [{ key: 'regenerate-qr', label: 'Regenerate table QR' }],
    group: 'operations',
    href: '/tables',
    icon: 'table_restaurant',
    key: 'tables',
    label: 'Tables',
  },
  {
    actions: ['view', 'add', 'edit', 'delete'],
    group: 'operations',
    href: '/floors',
    icon: 'floor',
    key: 'floors',
    label: 'Floors',
  },
  {
    actions: ['view'],
    advanced: [{ key: 'regenerate', label: 'Regenerate QR codes' }],
    group: 'operations',
    href: '/qr',
    icon: 'qr_code_2',
    key: 'qr',
    label: 'QR Codes',
  },
  {
    actions: ['view'],
    advanced: [{ key: 'resolve', label: 'Resolve requests' }],
    group: 'operations',
    href: '/service-requests',
    icon: 'support_agent',
    key: 'service-requests',
    label: 'Requests',
  },
  {
    actions: ['view', 'add', 'edit', 'delete'],
    group: 'menu',
    href: '/menu/categories',
    icon: 'category',
    key: 'menu-categories',
    label: 'Categories',
  },
  {
    actions: ['view', 'add', 'edit', 'delete'],
    advanced: [{ key: 'upload-media', label: 'Upload images' }],
    group: 'menu',
    href: '/menu/items',
    icon: 'restaurant_menu',
    key: 'menu-items',
    label: 'Menu Items',
  },
  {
    actions: ['view', 'add', 'edit', 'delete'],
    group: 'menu',
    href: '/menu/schedules',
    icon: 'schedule',
    key: 'menu-schedules',
    label: 'Schedules',
  },
  {
    actions: ['view'],
    group: 'admin',
    href: '/analytics',
    icon: 'insights',
    key: 'analytics',
    label: 'Analytics',
  },
  {
    actions: ['view', 'add', 'edit', 'delete'],
    group: 'admin',
    href: '/staff',
    icon: 'group',
    key: 'staff',
    label: 'Staff',
  },
  {
    actions: ['view', 'add', 'edit', 'delete'],
    group: 'admin',
    href: '/staff/roles',
    icon: 'admin_panel_settings',
    key: 'roles',
    label: 'Roles & Access',
  },
  {
    actions: ['view', 'add', 'edit', 'delete'],
    group: 'admin',
    href: '/branches',
    icon: 'storefront',
    key: 'branches',
    label: 'Outlets',
  },
  {
    actions: ['view'],
    group: 'admin',
    href: '/audit-logs',
    icon: 'fact_check',
    key: 'audit-logs',
    label: 'Audit Logs',
  },
  {
    actions: ['view'],
    advanced: [{ key: 'manage', label: 'Change plan and payment' }],
    group: 'admin',
    href: '/subscription',
    icon: 'workspace_premium',
    key: 'subscription',
    label: 'Subscription',
  },
  {
    actions: ['view', 'edit'],
    group: 'admin',
    href: '/settings',
    icon: 'settings',
    key: 'settings',
    label: 'Settings',
    locked: true,
  },
  {
    actions: ['view'],
    advanced: [{ key: 'manage', label: 'Manage the platform' }],
    group: 'admin',
    href: '/super-admin',
    icon: 'shield_person',
    key: 'platform',
    label: 'Platform admin',
    platformOnly: true,
  },
];

export const SCREENS_BY_KEY: Record<string, ScreenDefinition> = Object.fromEntries(
  SCREENS.map((screen) => [screen.key, screen]),
);

export const permissionKey = (screenKey: string, action: string): string => `${screenKey}:${action}`;

const permissionsOf = (screen: ScreenDefinition): string[] => [
  ...screen.actions.map((action) => permissionKey(screen.key, action)),
  ...(screen.advanced ?? []).map((advanced) => permissionKey(screen.key, advanced.key)),
];

export const ALL_PERMISSIONS: string[] = SCREENS.flatMap(permissionsOf);

export const PERMISSION_SET: ReadonlySet<string> = new Set(ALL_PERMISSIONS);

/** Everything a tenant may hand out — excludes the platform screens. */
export const TENANT_ASSIGNABLE_PERMISSIONS: string[] = SCREENS.filter(
  (screen) => !screen.platformOnly,
).flatMap(permissionsOf);

/** Granted to every role so nobody is left without a landing page. */
export const LOCKED_PERMISSIONS: string[] = SCREENS.filter((screen) => screen.locked).map((screen) =>
  permissionKey(screen.key, 'view'),
);

export const isValidPermission = (permission: string): boolean => PERMISSION_SET.has(permission);

/**
 * Expands a stored permission list, resolving `screen:*` wildcards and
 * re-adding the locked defaults.
 */
export const expandPermissions = (granted: readonly string[]): Set<string> => {
  const expanded = new Set<string>(LOCKED_PERMISSIONS);

  for (const entry of granted) {
    if (!entry.endsWith(':*')) {
      if (isValidPermission(entry)) {
        expanded.add(entry);
      }
      continue;
    }

    const screen = SCREENS_BY_KEY[entry.slice(0, -2)];
    if (screen) {
      for (const permission of permissionsOf(screen)) {
        expanded.add(permission);
      }
    }
  }

  return expanded;
};

// --- Role keys ------------------------------------------------------------

/** A built-in `UserRole` value or a tenant-defined role key. */
export type RoleKey = string;

export const BUILTIN_ROLE_KEYS: readonly string[] = Object.values(UserRole);
export const PLATFORM_ROLE_KEYS: readonly string[] = [UserRole.SuperAdmin, UserRole.PlatformAdmin];

export const isPlatformRoleKey = (role: string): boolean => PLATFORM_ROLE_KEYS.includes(role);
export const isBuiltinRoleKey = (role: string): role is UserRole => BUILTIN_ROLE_KEYS.includes(role);

const every = (screenKey: string): string[] => {
  const screen = SCREENS_BY_KEY[screenKey];

  if (!screen) {
    throw new Error(`Unknown screen key in role template: ${screenKey}`);
  }

  return permissionsOf(screen);
};

/**
 * Permissions for the built-in roles. These are derived from the existing
 * `@Roles(...)` route tuples and must stay behaviour-identical — see
 * `builtin-roles.spec.ts`, which pins each entry to the routes that justify it.
 */
export const BUILTIN_ROLE_PERMISSIONS: Record<string, string[]> = {
  [UserRole.SuperAdmin]: [...TENANT_ASSIGNABLE_PERMISSIONS, 'platform:view', 'platform:manage'],
  [UserRole.PlatformAdmin]: [...TENANT_ASSIGNABLE_PERMISSIONS, 'platform:view', 'platform:manage'],
  [UserRole.Owner]: [...TENANT_ASSIGNABLE_PERMISSIONS],
  [UserRole.Manager]: [
    'dashboard:view',
    ...every('orders'),
    'bills:view',
    'bills:request',
    'bills:mark-paid',
    'bills:mark-cash-paid',
    ...every('tables'),
    ...every('floors'),
    ...every('qr'),
    ...every('menu-categories'),
    ...every('menu-items'),
    ...every('menu-schedules'),
    ...every('service-requests'),
    'analytics:view',
    'branches:view',
    'settings:view',
    'settings:edit',
  ],
  [UserRole.Waiter]: [
    'dashboard:view',
    'orders:view',
    'orders:edit',
    'orders:confirm',
    'orders:reject',
    'orders:status-served',
    'bills:view',
    'bills:request',
    'bills:mark-paid',
    'bills:mark-cash-paid',
    'tables:view',
    'menu-categories:view',
    'menu-items:view',
    ...every('service-requests'),
    'branches:view',
    'settings:view',
  ],
  [UserRole.Kitchen]: [
    'dashboard:view',
    ...every('kitchen'),
    'orders:view',
    'orders:status-preparing',
    'orders:status-ready',
    'branches:view',
    'settings:view',
  ],
  [UserRole.Cashier]: [
    'dashboard:view',
    'orders:view',
    'bills:view',
    'bills:request',
    'bills:mark-paid',
    'bills:mark-cash-paid',
    'bills:checkout',
    'branches:view',
    'settings:view',
  ],
  [UserRole.Customer]: [],
};

export const permissionsForBuiltinRole = (role: string): string[] =>
  BUILTIN_ROLE_PERMISSIONS[role] ?? [];
