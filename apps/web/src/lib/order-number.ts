const trailingSequencePattern = /(?:^|[-_])(\d{1,8})$/;

export function formatOrderNumber(orderNo: string): string {
  const value = orderNo.trim();
  const sequence = trailingSequencePattern.exec(value)?.[1];

  if (sequence) {
    return `#${sequence}`;
  }

  return value.length > 12 ? `#${value.slice(-6).toUpperCase()}` : `#${value}`;
}
