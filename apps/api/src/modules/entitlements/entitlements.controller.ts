import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import type { StaffJwtPayload, TenantEntitlements } from '@restaurent/shared';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { StaffJwtGuard } from '../../common/guards/staff-jwt.guard';
import { AccessService } from '../../infrastructure/access/access.service';
import { EntitlementsService } from '../../infrastructure/entitlements/entitlements.service';

@Controller('cms/entitlements')
@UseGuards(StaffJwtGuard, PermissionsGuard)
export class CmsEntitlementsController {
  constructor(
    private readonly accessService: AccessService,
    private readonly entitlements: EntitlementsService,
  ) {}

  /**
   * Plan limits plus live usage, for the owner-facing meters. Gated on
   * settings:view (which every role holds) rather than subscription:view, so a
   * waiter blocked by a cap still gets a meaningful message.
   */
  @Get()
  @RequirePermissions('settings:view')
  async get(
    @Query('tenantId') tenantId: string,
    @CurrentUser() user: StaffJwtPayload,
  ): Promise<TenantEntitlements> {
    const scoped = tenantId || user.tenantId;
    await this.accessService.assertTenantAccess(user, scoped);
    return this.entitlements.getEntitlementsWithUsage(scoped);
  }
}
