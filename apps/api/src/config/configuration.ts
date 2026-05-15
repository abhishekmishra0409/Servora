const parseOrigins = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const parseNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export default () => ({
  api: {
    port: parseNumber(process.env.API_PORT, 4000),
  },
  app: {
    corsOrigins: parseOrigins(process.env.CORS_ORIGINS),
    name: process.env.APP_NAME ?? 'Restaurent SaaS',
  },
  auth: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'access-secret',
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    guestSecret: process.env.JWT_GUEST_SECRET ?? 'guest-secret',
    guestTtl: process.env.JWT_GUEST_TTL ?? '6h',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'refresh-secret',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  },
  billing: {
    stripe: {
      priceEnterprise: process.env.STRIPE_PRICE_ENTERPRISE ?? '',
      priceGrowth: process.env.STRIPE_PRICE_GROWTH ?? '',
      priceLaunch: process.env.STRIPE_PRICE_LAUNCH ?? '',
      secretKey: process.env.STRIPE_SECRET_KEY ?? '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
    },
  },
  media: {
    apiKey: process.env.CLOUDINARY_API_KEY ?? '',
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
    folder: process.env.CLOUDINARY_FOLDER ?? 'restaurent',
  },
  mongo: {
    dbName: process.env.MONGODB_DB_NAME ?? 'restaurent_saas',
    uri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017',
  },
  throttling: {
    max: parseNumber(process.env.RATE_LIMIT_MAX, 200),
    ttl: parseNumber(process.env.RATE_LIMIT_TTL, 60),
  },
});
