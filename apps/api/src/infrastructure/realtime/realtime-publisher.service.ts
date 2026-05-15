import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';

@Injectable()
export class RealtimePublisher {
  private readonly logger = new Logger(RealtimePublisher.name);
  private server?: Server;

  bindServer(server: Server): void {
    this.server = server;
  }

  publishRealtimeEvent(room: string, event: string, payload: Record<string, unknown>): Promise<void> {
    if (!this.server) {
      this.logger.debug(`realtime server not ready for ${event}`);
      return Promise.resolve();
    }

    this.server.to(room).emit(event, payload);
    return Promise.resolve();
  }
}
