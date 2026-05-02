import { createAdapter } from '@socket.io/redis-streams-adapter';
import Redis from 'ioredis';

export const createRedisStreamsAdapter = (redisUrl: string) => {
  const redis = new Redis(redisUrl);
  return createAdapter(redis);
};

