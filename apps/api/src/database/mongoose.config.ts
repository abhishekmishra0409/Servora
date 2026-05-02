import type { MongooseModuleOptions } from '@nestjs/mongoose';
import type { ConfigService } from '@nestjs/config';

export const createMongooseOptions = (
  configService: ConfigService,
): MongooseModuleOptions => ({
  dbName: configService.getOrThrow<string>('mongo.dbName'),
  uri: configService.getOrThrow<string>('mongo.uri'),
});
