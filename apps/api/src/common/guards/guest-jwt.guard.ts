import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { GuestJwtPayload } from '@restaurent/shared';
import type { Request } from 'express';

@Injectable()
export class GuestJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: GuestJwtPayload }>();
    const header = request.headers.authorization;
    const token = header?.replace(/^Bearer\s+/i, '');

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    let payload: GuestJwtPayload;

    try {
      payload = this.jwtService.verify<GuestJwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('auth.guestSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired guest token');
    }

    if (payload.type !== 'guest') {
      throw new UnauthorizedException('Invalid guest token');
    }

    request.user = payload;
    return true;
  }
}
