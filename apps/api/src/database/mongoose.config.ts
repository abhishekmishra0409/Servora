import type { MongooseModuleOptions } from '@nestjs/mongoose';
import type { ConfigService } from '@nestjs/config';

export const createMongooseOptions = (
  configService: ConfigService,
): MongooseModuleOptions => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    dbName: configService.getOrThrow<string>('mongo.dbName'),
    uri: configService.getOrThrow<string>('mongo.uri'),
    // Resilience against Atlas latency/failover — forgiving selection/connect
    // windows (transient blips shouldn't kill boot) with a bounded socket
    // timeout, a small pool, and read retries (retryWrites comes from the URI).
    serverSelectionTimeoutMS: 30_000,
    connectTimeoutMS: 20_000,
    socketTimeoutMS: 45_000,
    heartbeatFrequencyMS: 10_000,
    maxPoolSize: 10,
    minPoolSize: 0,
    retryReads: true,
    // Build indexes automatically in dev/test only. In production run
    // `npm run sync-indexes` so boot doesn't stall on index builds against Atlas.
    autoIndex: !isProduction,
  };
};
