import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { GuestJwtPayload, StaffJwtPayload } from '@restaurent/shared';

@Injectable()
export class SocketAuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  authenticate(token?: string): GuestJwtPayload | StaffJwtPayload {
    if (!token) {
      throw new UnauthorizedException('Socket token missing');
    }

    const accessSecret = this.configService.getOrThrow<string>('auth.accessSecret');
    const guestSecret = this.configService.getOrThrow<string>('auth.guestSecret');

    const staffPayload = this.verifyToken<StaffJwtPayload>(token, accessSecret);
    if (staffPayload?.type === 'staff') {
      return staffPayload;
    }

    const guestPayload = this.verifyToken<GuestJwtPayload>(token, guestSecret);
    if (guestPayload?.type === 'guest') {
      return guestPayload;
    }

    throw new UnauthorizedException('Socket token invalid');
  }

  private verifyToken<TPayload extends object>(token: string, secret: string): TPayload | undefined {
    try {
      return this.jwtService.verify<TPayload>(token, { secret });
    } catch {
      return undefined;
    }
  }
}
