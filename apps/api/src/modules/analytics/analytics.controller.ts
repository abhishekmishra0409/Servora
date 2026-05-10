import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@restaurent/shared';
import type { StaffJwtPayload } from '@restaurent/shared';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StaffJwtGuard } from '../../common/guards/staff-jwt.guard';
import { AccessService } from '../../infrastructure/access/access.service';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(StaffJwtGuard, RolesGuard)
@Roles(UserRole.PlatformAdmin, UserRole.Owner, UserRole.Manager)
export class AnalyticsController {
  constructor(
    private readonly accessService: AccessService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Get('overview')
  async overview(@Query('branchId') branchId: string, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    await this.accessService.assertBranchAccess(user, branchId);
    return this.analyticsService.overview(branchId);
  }

  @Get('menu')
  async menu(@Query('branchId') branchId: string, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    await this.accessService.assertBranchAccess(user, branchId);
    return this.analyticsService.menu(branchId);
  }
}
