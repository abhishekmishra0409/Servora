import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

import { QueueService } from '../../infrastructure/queue/queue.service';

@Injectable()
export class HealthService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly queueService: QueueService,
  ) {}

  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async getReady(): Promise<{ checks: Record<string, boolean>; ready: boolean }> {
    const mongo = this.connection.readyState === 1;
    const redis = await this.queueService.ping().catch(() => false);

    return {
      checks: { mongo, redis },
      ready: mongo && redis,
    };
  }
}
