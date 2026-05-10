import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole, type StaffJwtPayload } from '@restaurent/shared';

import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!roles || roles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: StaffJwtPayload }>();

    const superAdminCanUsePlatformRoute =
      request.user?.role === UserRole.SuperAdmin && roles.includes(UserRole.PlatformAdmin);

    if (!request.user || (!roles.includes(request.user.role) && !superAdminCanUsePlatformRoute)) {
      throw new ForbiddenException('Missing required role');
    }

    return true;
  }
}
