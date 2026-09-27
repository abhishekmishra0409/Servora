import { PLAN_CODES } from './constants';

/**
 * Plan entitlements: the limits and feature flags a subscription grants.
 *
 * These defaults used to live inline in `apps/api/.../billing.service.ts`,
 * which meant the web app could not reason about them at all. They live here
 * so the super-admin editor, the owner-facing usage meters, and the API's
 * limit checks all agree on what a plan includes.
 */

export type PlanCode = (typeof PLAN_CODES)[number];

export const isPlanCode = (value: string): value is PlanCode =>
  (PLAN_CODES as readonly string[]).includes(value);

/** Resources a plan can cap. `0` means unlimited, matching the existing convention. */
export const ENTITLED_RESOURCES = [
  'employees',
  'branches',
  'tables',
  'monthlyBills',
  'menuItems',
  'customRoles',
] as const;

export type EntitledResource = (typeof ENTITLED_RESOURCES)[number];

export type PlanLimits = Record<EntitledResource, number>;

export const RESOURCE_LABELS: Record<EntitledResource, string> = {
  branches: 'Outlets',
  customRoles: 'Custom roles',
  employees: 'Staff accounts',
  menuItems: 'Menu items',
  monthlyBills: 'Bills this month',
  tables: 'Tables',
};

/** Capability flags that gate whole features rather than counting things. */
export const PLAN_FEATURES = [
  { key: 'custom_roles', label: 'Custom role builder' },
  { key: 'multi_outlet', label: 'Multiple outlets' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'audit_logs', label: 'Audit logs' },
] as const;

export type PlanFeatureKey = (typeof PLAN_FEATURES)[number]['key'];

export interface PlanEntitlements {
  features: string[];
  limits: PlanLimits;
}

export const PLAN_DEFAULTS: Record<PlanCode, PlanEntitlements> = {
  enterprise: {
    features: ['custom_roles', 'multi_outlet', 'analytics', 'audit_logs'],
    limits: {
      branches: 0,
      customRoles: 0,
      employees: 0,
      menuItems: 0,
      monthlyBills: 0,
      tables: 0,
    },
  },
  growth: {
    features: ['custom_roles', 'multi_outlet', 'analytics'],
    limits: {
      branches: 3,
      customRoles: 5,
      employees: 25,
      menuItems: 500,
      monthlyBills: 1500,
      tables: 150,
    },
  },
  launch: {
    features: ['analytics'],
    limits: {
      branches: 1,
      customRoles: 0,
      employees: 8,
      menuItems: 120,
      monthlyBills: 300,
      tables: 40,
    },
  },
};

/** `0` is unlimited, so a cap is only reached when it is set and met. */
export const isLimitReached = (used: number, limit: number): boolean => limit > 0 && used >= limit;

export interface TenantEntitlements {
  features: string[];
  limits: PlanLimits;
  planCode: string;
  planName: string;
  source: 'plan' | 'override' | 'fallback';
  usage: Partial<Record<EntitledResource, number>>;
}

/** Error payload the API returns when a create is refused by a plan cap. */
export const PLAN_LIMIT_ERROR_CODE = 'PLAN_LIMIT_REACHED';

export interface PlanLimitErrorDetails {
  limit: number;
  planCode: string;
  resource: EntitledResource;
  used: number;
}
