import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import type { StaffJwtPayload } from '@restaurent/shared';
import { UserRole } from '@restaurent/shared';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StaffJwtGuard } from '../../common/guards/staff-jwt.guard';
import { AccessService } from '../../infrastructure/access/access.service';
import { AuditService } from '../../infrastructure/audit/audit.service';

@Controller('cms/audit-logs')
@UseGuards(StaffJwtGuard, RolesGuard)
@Roles(UserRole.Owner, UserRole.Manager)
export class AuditLogsController {
  constructor(
    private readonly accessService: AccessService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  async list(
    @Query('tenantId') tenantId: string,
    @Query('branchId') branchId: string | undefined,
    @CurrentUser() user: StaffJwtPayload,
  ): Promise<unknown> {
    await this.accessService.assertTenantAccess(user, tenantId);
    if (branchId) {
      await this.accessService.assertBranchAccess(user, branchId);
    }
    return this.auditService.list(tenantId, branchId);
  }
}

