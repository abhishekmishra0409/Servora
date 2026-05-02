export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const currency = (amount: number, locale = 'en-IN', code = 'INR'): string =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
    maximumFractionDigits: 2,
  }).format(amount);

export const assertNever = (_value: never): never => {
  throw new Error('Unexpected value');
};

