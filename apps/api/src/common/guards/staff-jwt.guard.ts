import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { StaffJwtPayload } from '@restaurent/shared';
import type { Request } from 'express';

@Injectable()
export class StaffJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: StaffJwtPayload }>();
    const header = request.headers.authorization;
    const token = header?.replace(/^Bearer\s+/i, '');

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const payload = this.jwtService.verify<StaffJwtPayload>(token, {
      secret: this.configService.getOrThrow<string>('auth.accessSecret'),
    });

    if (payload.type !== 'staff') {
      throw new UnauthorizedException('Invalid staff token');
    }

    request.user = payload;
    return true;
  }
}
