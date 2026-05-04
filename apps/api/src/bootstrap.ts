import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

import { HttpExceptionFilter } from './common/filters/http-exception.filter';

const privateNetworkPattern =
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

export const configureApp = (app: INestApplication): void => {
  const configService = app.get(ConfigService);
  const corsOrigins = configService.get<string[]>('app.corsOrigins', []);
  const allowPrivateNetworkOrigins = process.env.NODE_ENV !== 'production';
  const requestLogger = new Logger('HTTP');

  app.setGlobalPrefix('api/v1');
  app.use((request: Request, response: Response, next: NextFunction) => {
    const requestId = String(request.headers['x-request-id'] ?? randomUUID());
    const startedAt = Date.now();
    response.setHeader('x-request-id', requestId);
    response.on('finish', () => {
      requestLogger.log(JSON.stringify({
        durationMs: Date.now() - startedAt,
        method: request.method,
        path: request.originalUrl,
        requestId,
        statusCode: response.statusCode,
      }));
    });
    next();
  });
  app.use(cookieParser());
  app.enableCors({
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      if (!origin || corsOrigins.includes(origin) || (allowPrivateNetworkOrigins && privateNetworkPattern.test(origin))) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS origin not allowed: ${origin}`));
    },
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
};
