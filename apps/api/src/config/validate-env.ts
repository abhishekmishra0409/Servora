const JWT_SECRET_KEYS = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'JWT_GUEST_SECRET'] as const;

// Known weak/placeholder values that must never sign real tokens — rejected in
// every environment (a leaked default secret lets anyone forge staff/guest JWTs).
const WEAK_SECRETS = new Set([
  'replace-me-access',
  'replace-me-refresh',
  'replace-me-guest',
  'access-secret',
  'refresh-secret',
  'guest-secret',
  'secret',
  'change-me',
  'changeme',
]);

const MIN_PROD_SECRET_LENGTH = 32;

export const validateEnv = (env: Record<string, string | undefined>): Record<string, string | undefined> => {
  const required = [
    'CORS_ORIGINS',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'JWT_GUEST_SECRET',
    'MONGODB_URI',
    'WEB_URL',
  ];
  const missing = required.filter((key) => !env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Reject known placeholder secrets in ALL environments.
  const weak = JWT_SECRET_KEYS.filter((key) => WEAK_SECRETS.has((env[key] ?? '').toLowerCase()));
  if (weak.length > 0) {
    throw new Error(
      `Insecure placeholder JWT secret(s): ${weak.join(', ')}. Set strong random values ` +
        `(e.g. \`node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"\`).`,
    );
  }

  // Stricter rules for production: sufficient length and all three distinct.
  if (env.NODE_ENV === 'production') {
    const tooShort = JWT_SECRET_KEYS.filter((key) => (env[key] ?? '').length < MIN_PROD_SECRET_LENGTH);
    if (tooShort.length > 0) {
      throw new Error(
        `JWT secret(s) too short for production (need >= ${MIN_PROD_SECRET_LENGTH} chars): ${tooShort.join(', ')}.`,
      );
    }

    const values = JWT_SECRET_KEYS.map((key) => env[key]);
    if (new Set(values).size !== values.length) {
      throw new Error('JWT_ACCESS_SECRET, JWT_REFRESH_SECRET and JWT_GUEST_SECRET must all be distinct.');
    }

    if (!env.STRIPE_WEBHOOK_SECRET && env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_WEBHOOK_SECRET is required in production when STRIPE_SECRET_KEY is set.');
    }
  }

  return env;
};
