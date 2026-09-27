import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole, type StaffJwtPayload } from '@restaurent/shared';

import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
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

    // Where a route declares permissions, those are authoritative and this
    // guard stands down. A tenant-defined role has no `UserRole` value, so the
    // role tuple below would reject it no matter what its permissions say.
    // `permission-parity.spec.ts` pins the two to the same answer for every
    // built-in role, so standing down here cannot widen access.
    const requiresPermissions = this.reflector.getAllAndOverride(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiresPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: StaffJwtPayload }>();

    const superAdminCanUsePlatformRoute =
      request.user?.role === UserRole.SuperAdmin && roles.includes(UserRole.PlatformAdmin);

    const allowed = roles as readonly string[];

    if (!request.user || (!allowed.includes(request.user.role) && !superAdminCanUsePlatformRoute)) {
      throw new ForbiddenException('Missing required role');
    }

    return true;
  }
}
