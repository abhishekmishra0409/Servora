import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REALTIME_REDIS_CHANNEL = 'restaurent:realtime-events';

@Injectable()
export class RealtimePublisher implements OnModuleDestroy {
  private readonly logger = new Logger(RealtimePublisher.name);
  private readonly redis?: Redis;
  private loggedConnectionError = false;

  constructor(configService: ConfigService) {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    this.redis = new Redis(configService.get<string>('redis.url', 'redis://localhost:6379'), {
      connectTimeout: 1_000,
      enableOfflineQueue: false,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });
    this.redis.on('error', (error) => {
      if (this.loggedConnectionError) {
        return;
      }

      this.loggedConnectionError = true;
      this.logger.warn(`realtime redis unavailable: ${error.message}`);
    });
  }

  async publishRealtimeEvent(room: string, event: string, payload: Record<string, unknown>): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      await this.redis.publish(REALTIME_REDIS_CHANNEL, JSON.stringify({ event, payload, room }));
    } catch (error) {
      this.logger.warn(`realtime unavailable for ${event}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  onModuleDestroy(): void {
    this.redis?.disconnect();
  }
}
