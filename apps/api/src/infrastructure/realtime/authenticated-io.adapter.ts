import type { INestApplicationContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { Server, ServerOptions } from 'socket.io';

const privateNetworkPattern =
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

/**
 * Socket.IO adapter that applies the same CORS allow-list as the HTTP layer
 * (CORS_ORIGINS + private-network origins outside production) instead of the
 * previous `origin: '*'`. Connection auth is still enforced per-socket by the
 * gateways; this stops arbitrary browser origins from opening sockets at all.
 */
export class RealtimeIoAdapter extends IoAdapter {
  private readonly corsOrigins: string[];
  private readonly allowPrivateNetworkOrigins: boolean;

  constructor(app: INestApplicationContext) {
    super(app);
    const configService = app.get(ConfigService);
    this.corsOrigins = configService.get<string[]>('app.corsOrigins', []);
    this.allowPrivateNetworkOrigins = process.env.NODE_ENV !== 'production';
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    const corsOptions: ServerOptions['cors'] = {
      credentials: true,
      origin: (origin, callback) => {
        if (
          !origin ||
          this.corsOrigins.includes(origin) ||
          (this.allowPrivateNetworkOrigins && privateNetworkPattern.test(origin))
        ) {
          callback(null, true);
          return;
        }

        callback(new Error(`WS CORS origin not allowed: ${origin}`));
      },
    };

    return super.createIOServer(port, { ...options, cors: corsOptions }) as Server;
  }
}
