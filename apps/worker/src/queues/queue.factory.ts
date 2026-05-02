import Redis from 'ioredis';

export const createRedisConnection = (url: string): Redis =>
  new Redis(url, {
    maxRetriesPerRequest: null,
  });
