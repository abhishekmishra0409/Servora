import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import type { Server } from 'socket.io';

const REALTIME_REDIS_CHANNEL = 'restaurent:realtime-events';

@Injectable()
export class RealtimeBusService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RealtimeBusService.name);
  private readonly subscriber?: Redis;
  private loggedConnectionError = false;
  private server?: Server;

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      this.logger.warn('REDIS_URL is not configured; internal realtime event bus is disabled.');
      return;
    }

    this.subscriber = new Redis(redisUrl, {
      connectTimeout: 1_000,
      enableOfflineQueue: false,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });
    this.subscriber.on('error', (error) => {
      if (this.loggedConnectionError) {
        return;
      }

      this.loggedConnectionError = true;
      this.logger.warn(`Realtime Redis bus unavailable: ${error.message}`);
    });
  }

  bindServer(server: Server): void {
    this.server = server;
  }

  async onModuleInit(): Promise<void> {
    if (!this.subscriber) {
      return;
    }

    try {
      await this.subscriber.connect();
      await this.subscriber.subscribe(REALTIME_REDIS_CHANNEL);
    } catch (error) {
      this.logger.warn(`Realtime Redis bus unavailable: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }

    this.subscriber.on('message', (_channel, raw) => {
      try {
        const message = JSON.parse(raw) as {
          event?: string;
          payload?: Record<string, unknown>;
          room?: string;
        };

        if (!message.event || !message.room || !this.server) {
          return;
        }

        this.server.to(message.room).emit(message.event, message.payload ?? {});
      } catch (error) {
        this.logger.warn(`Could not publish realtime event: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  onModuleDestroy(): void {
    this.subscriber?.disconnect();
  }
}
