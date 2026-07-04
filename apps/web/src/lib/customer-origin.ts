const configuredCustomerOrigin = process.env.NEXT_PUBLIC_CUSTOMER_ORIGIN || '';

/**
 * Origin encoded into customer-facing QR URLs.
 *
 * Defaults to the origin the CMS is currently opened on — the production domain
 * in prod, `localhost` in local dev. Set NEXT_PUBLIC_CUSTOMER_ORIGIN only when
 * the customer app is served from a different domain than the CMS.
 *
 * No LAN/router IP is ever baked in: whatever host the operator loads the CMS
 * from is what the QR points at, so an IP/DNS change can never brick the codes.
 */
export function resolveCustomerOrigin(): string {
  if (configuredCustomerOrigin) return configuredCustomerOrigin.replace(/\/$/, '');
  if (typeof window === 'undefined') {
    return (process.env.WEB_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  }
  return window.location.origin.replace(/\/$/, '');
}

/** True when the origin's host is loopback — a QR built from it won't work off-machine. */
export function isLocalhostOrigin(origin: string): boolean {
  try {
    return ['localhost', '127.0.0.1', '::1'].includes(new URL(origin).hostname);
  } catch {
    return false;
  }
}
