import Redis from 'ioredis';

export const createRedisConnection = (url: string): Redis =>
  new Redis(url, {
    connectTimeout: 1_000,
    enableOfflineQueue: false,
    maxRetriesPerRequest: null,
    retryStrategy: () => null,
  });
