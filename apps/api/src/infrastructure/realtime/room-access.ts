import { UserRole, type StaffJwtPayload } from '@restaurent/shared';

const GLOBAL_ADMIN_ROLES: readonly UserRole[] = [UserRole.SuperAdmin, UserRole.PlatformAdmin];

/**
 * Whether a staff member may subscribe to realtime updates for a tenant/branch-
 * scoped record. Platform/super admins see everything; otherwise the record must
 * be in the caller's tenant, and — when the caller is branch-scoped — their branch.
 */
export const staffCanAccessRecord = (
  user: StaffJwtPayload,
  record: { tenantId: string; branchId?: string },
): boolean => {
  if (GLOBAL_ADMIN_ROLES.includes(user.role)) {
    return true;
  }

  if (String(record.tenantId) !== user.tenantId) {
    return false;
  }

  if (user.branchId && record.branchId && String(record.branchId) !== user.branchId) {
    return false;
  }

  return true;
};
