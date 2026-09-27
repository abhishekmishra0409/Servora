import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { isPlatformRoleKey, type StaffJwtPayload } from '@restaurent/shared';

import { PERMISSIONS_KEY, type PermissionRequirement } from '../decorators/require-permissions.decorator';
import { PermissionResolverService } from '../../infrastructure/access/permission-resolver.service';

/**
 * Coarse permission gate: "is this person allowed to do this kind of thing
 * anywhere in their tenant?"
 *
 * It deliberately uses the union of permissions across all of the caller's
 * memberships, because a guard runs before the handler and cannot yet know
 * which branch a request touches — `POST /orders/:id/confirm` derives the
 * branch from the order. The authoritative, branch-specific check happens in
 * `AccessService.assertBranchAccess`, which already resolves record → branch.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionResolver: PermissionResolverService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<PermissionRequirement>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requirement?.anyOf?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: StaffJwtPayload }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Missing required permission');
    }

    // Platform staff bypass tenant permissions, matching AccessService.
    if (isPlatformRoleKey(user.role)) {
      return true;
    }

    const permissions = await this.permissionResolver.resolveTenantWide(user.sub, user.tenantId);

    if (!requirement.anyOf.some((permission) => permissions.has(permission))) {
      throw new ForbiddenException('Missing required permission');
    }

    return true;
  }
}
