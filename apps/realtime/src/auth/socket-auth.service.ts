import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { GuestJwtPayload, StaffJwtPayload } from '@restaurent/shared';

@Injectable()
export class SocketAuthService {
  constructor(private readonly jwtService: JwtService) {}

  authenticate(token?: string): GuestJwtPayload | StaffJwtPayload {
    if (!token) {
      throw new UnauthorizedException('Socket token missing');
    }

    try {
      return this.jwtService.decode(token) as GuestJwtPayload | StaffJwtPayload;
    } catch {
      throw new UnauthorizedException('Socket token invalid');
    }
  }
}

