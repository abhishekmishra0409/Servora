export type StatusTone = 'default' | 'success' | 'warning' | 'info' | 'destructive' | 'primary';

export type StatusKind = 'order' | 'table' | 'service' | 'payment' | 'subscription' | 'tenant' | 'menu' | 'bill';

const toneMaps: Record<StatusKind, Record<string, StatusTone>> = {
  bill: {
    cancelled: 'default',
    closed: 'default',
    paid: 'success',
    pending: 'warning',
    requested: 'warning',
    settled: 'success',
  },
  menu: {
    active: 'success',
    available: 'success',
    disabled: 'default',
    hidden: 'default',
    out_of_stock: 'warning',
    unavailable: 'warning',
  },
  order: {
    accepted: 'info',
    closed: 'default',
    pending_confirmation: 'warning',
    preparing: 'info',
    ready: 'success',
    rejected: 'destructive',
    served: 'default',
  },
  payment: {
    authorized: 'info',
    captured: 'success',
    failed: 'destructive',
    pending: 'warning',
  },
  service: {
    assigned: 'info',
    open: 'warning',
    resolved: 'success',
  },
  subscription: {
    active: 'success',
    cancelled: 'default',
    grace_period: 'warning',
    past_due: 'warning',
    suspended: 'destructive',
    trialing: 'info',
  },
  table: {
    free: 'success',
    occupied: 'default',
    preparing: 'info',
    ready: 'success',
    waiting_confirmation: 'warning',
  },
  tenant: {
    active: 'success',
    archived: 'default',
    cancelled: 'default',
    past_due: 'warning',
    suspended: 'destructive',
    trialing: 'info',
  },
};

export function toneFor(kind: StatusKind, value: string): StatusTone {
  return toneMaps[kind][value] ?? 'default';
}

/** `pending_confirmation` -> `Pending confirmation`; `menu_item.updated` -> `Menu item updated`. */
export function humanize(value: string): string {
  const spaced = value.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : '';
}
