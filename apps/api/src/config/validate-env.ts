import { envKeys } from './env.schema';

export const validateEnv = (env: Record<string, string | undefined>): Record<string, string | undefined> => {
  const required = [
    'CORS_ORIGINS',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'JWT_GUEST_SECRET',
    'MONGODB_URI',
    'REDIS_URL',
    'WEB_URL',
  ];
  const missing = required.filter((key) => !env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  for (const key of envKeys) {
    if (!(key in env)) {
      env[key] = env[key] ?? undefined;
    }
  }

  return env;
};
