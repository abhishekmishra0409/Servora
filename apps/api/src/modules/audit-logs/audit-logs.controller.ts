import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import type { StaffJwtPayload } from '@restaurent/shared';
import { isPlatformRoleKey, UserRole } from '@restaurent/shared';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { StaffJwtGuard } from '../../common/guards/staff-jwt.guard';
import { AccessService } from '../../infrastructure/access/access.service';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { EntitlementsService } from '../../infrastructure/entitlements/entitlements.service';

@Controller('cms/audit-logs')
@UseGuards(StaffJwtGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.PlatformAdmin, UserRole.Owner)
export class AuditLogsController {
  constructor(
    private readonly accessService: AccessService,
    private readonly auditService: AuditService,
    private readonly entitlements: EntitlementsService,
  ) {}

  @Get()
  @RequirePermissions('audit-logs:view')
  async list(
    @Query('tenantId') tenantId: string,
    @Query('branchId') branchId: string | undefined,
    @CurrentUser() user: StaffJwtPayload,
  ): Promise<unknown> {
    await this.accessService.assertTenantAccess(user, tenantId);
    if (!isPlatformRoleKey(user.role)) {
      await this.entitlements.assertFeature(tenantId, 'audit_logs');
    }
    if (branchId) {
      await this.accessService.assertBranchAccess(user, branchId);
    }
    return this.auditService.list(tenantId, branchId);
  }
}
