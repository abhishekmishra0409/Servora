const inr = new Intl.NumberFormat('en-IN', { currency: 'INR', style: 'currency' });

export const money = (value: number): string => inr.format(value);

/** Last four characters of an id, for compact table references. */
export const shortId = (value: string | undefined | null): string => (value ? value.slice(-4) : '----');

export function elapsedSince(iso?: string | null): string {
  if (!iso) {
    return 'New';
  }
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) {
    return '';
  }
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}
