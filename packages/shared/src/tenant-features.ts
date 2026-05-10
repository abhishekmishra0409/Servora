export const TENANT_FEATURES = [
  { key: 'analytics', label: 'Analytics' },
  { key: 'billing', label: 'Billing' },
  { key: 'kitchen', label: 'Kitchen board' },
  { key: 'menu', label: 'Menu management' },
  { key: 'orders', label: 'Orders' },
  { key: 'service_requests', label: 'Service requests' },
  { key: 'settings', label: 'Settings' },
  { key: 'staff', label: 'Staff access' },
  { key: 'tables', label: 'Tables and QR' },
] as const;

export type TenantFeatureKey = (typeof TENANT_FEATURES)[number]['key'];

export const TENANT_FEATURE_KEYS = TENANT_FEATURES.map((feature) => feature.key);
export const DEFAULT_TENANT_FEATURES = [...TENANT_FEATURE_KEYS];
