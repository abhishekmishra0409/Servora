import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'requiredPermissions';

export interface PermissionRequirement {
  anyOf: string[];
}

/**
 * Declares the permissions a route needs. The holder needs at least one of
 * them, which mirrors how the `@Roles(...)` tuples this replaces behaved.
 */
export const RequirePermissions = (...permissions: string[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(PERMISSIONS_KEY, { anyOf: permissions } satisfies PermissionRequirement);
