import { Controller, Get, UseGuards } from '@nestjs/common';
import type { StaffJwtPayload } from '@restaurent/shared';
import { UserRole } from '@restaurent/shared';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StaffJwtGuard } from '../../common/guards/staff-jwt.guard';
import { TenantsService } from './tenants.service';

@Controller('tenants')
@UseGuards(StaffJwtGuard, RolesGuard)
@Roles(
  UserRole.PlatformAdmin,
  UserRole.Owner,
  UserRole.Manager,
  UserRole.Waiter,
  UserRole.Kitchen,
  UserRole.Cashier,
)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  list(@CurrentUser() user: StaffJwtPayload): Promise<unknown[]> {
    return this.tenantsService.list(user);
  }
}
