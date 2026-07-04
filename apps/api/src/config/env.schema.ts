// Documentation of the server-side env keys the API reads. Not enforced as an
// allow-list — presence/strength rules live in validate-env.ts.
export const envKeys = [
  'NODE_ENV',
  'API_PORT',
  'API_URL',
  'APP_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_FOLDER',
  'CORS_ORIGINS',
  'JWT_ACCESS_SECRET',
  'JWT_ACCESS_TTL',
  'JWT_GUEST_SECRET',
  'JWT_GUEST_TTL',
  'JWT_REFRESH_SECRET',
  'JWT_REFRESH_TTL',
  'LOG_LEVEL',
  'MONGODB_DB_NAME',
  'MONGODB_URI',
  'RATE_LIMIT_MAX',
  'RATE_LIMIT_TTL',
  'REALTIME_URL',
  'STRIPE_PRICE_ENTERPRISE',
  'STRIPE_PRICE_GROWTH',
  'STRIPE_PRICE_LAUNCH',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'WEB_PORT',
  'WEB_URL',
] as const;

export type EnvKey = (typeof envKeys)[number];
