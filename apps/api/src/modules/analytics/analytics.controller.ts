import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@restaurent/shared';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StaffJwtGuard } from '../../common/guards/staff-jwt.guard';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(StaffJwtGuard, RolesGuard)
@Roles(UserRole.Owner, UserRole.Manager)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  overview(@Query('branchId') branchId: string): Promise<unknown> {
    return this.analyticsService.overview(branchId);
  }

  @Get('menu')
  menu(@Query('branchId') branchId: string): Promise<unknown> {
    return this.analyticsService.menu(branchId);
  }
}

