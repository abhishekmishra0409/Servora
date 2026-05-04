import { createAdapter } from '@socket.io/redis-streams-adapter';
import Redis from 'ioredis';

export const createRedisStreamsAdapter = (redisUrl: string) => {
  let loggedConnectionError = false;
  const redis = new Redis(redisUrl, {
    connectTimeout: 1_000,
    enableOfflineQueue: false,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });
  redis.on('error', (error) => {
    if (loggedConnectionError) {
      return;
    }

    loggedConnectionError = true;
    console.warn(`[realtime] Redis streams adapter unavailable: ${error.message}`);
  });
  return createAdapter(redis);
};
