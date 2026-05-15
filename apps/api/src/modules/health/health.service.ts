import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class HealthService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async getReady(): Promise<{ checks: Record<string, boolean>; ready: boolean }> {
    const mongo = this.connection.readyState === 1;

    return {
      checks: { mongo },
      ready: mongo,
    };
  }
}
