import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Model } from 'mongoose';

import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';

type ModelClass = { name: string };

const normalizeDbName = (dbName: string): string => {
  const suffix = Math.abs([...dbName].reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0))
    .toString(36)
    .slice(0, 8);
  return `rst_${suffix}`.slice(0, 38);
};

const ensureTestEnv = (dbName: string): void => {
  process.env.API_PORT = process.env.API_PORT ?? '0';
  process.env.APP_NAME = process.env.APP_NAME ?? 'Restaurent SaaS Tests';
  process.env.CORS_ORIGINS = process.env.CORS_ORIGINS ?? 'http://127.0.0.1';
  process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'test-access-secret';
  process.env.JWT_ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? '15m';
  process.env.JWT_GUEST_SECRET = process.env.JWT_GUEST_SECRET ?? 'test-guest-secret';
  process.env.JWT_GUEST_TTL = process.env.JWT_GUEST_TTL ?? '6h';
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret';
  process.env.JWT_REFRESH_TTL = process.env.JWT_REFRESH_TTL ?? '7d';
  process.env.MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017';
  process.env.MONGODB_DB_NAME = normalizeDbName(dbName);
  process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
};

export const createTestApp = async (dbName: string): Promise<INestApplication> => {
  ensureTestEnv(dbName);

  const app = await NestFactory.create(AppModule, {
    abortOnError: false,
    rawBody: true,
    logger: ['error', 'warn'],
  });

  configureApp(app);
  await app.listen(0);

  return app;
};

export const getModel = <T>(app: INestApplication, modelClass: ModelClass): Model<T> =>
  app.get<Model<T>>(getModelToken(modelClass.name));

export const getBaseUrl = (app: INestApplication): string => {
  const server = app.getHttpServer() as { address(): { port: number } };
  const address = server.address();
  return `http://127.0.0.1:${address.port}`;
};

export const cleanupTestDatabase = async (app: INestApplication): Promise<void> => {
  const connection = app.get<{ collections: Record<string, { deleteMany(filter: object): Promise<unknown> }> }>(getConnectionToken());
  await Promise.all(Object.values(connection.collections).map((collection) => collection.deleteMany({})));
};
