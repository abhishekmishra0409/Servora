import 'reflect-metadata';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { configureApp, resolveLogLevels } from './bootstrap';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    logger: resolveLogLevels(),
  });
  const configService = app.get(ConfigService);
  const port = configService.get<number>('api.port', 4000);
  configureApp(app);
  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');
}

void bootstrap();
