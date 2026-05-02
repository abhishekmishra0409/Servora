import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '@restaurent/shared';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StaffJwtGuard } from '../../common/guards/staff-jwt.guard';
import { TenantsService } from './tenants.service';

@Controller('tenants')
@UseGuards(StaffJwtGuard, RolesGuard)
@Roles(UserRole.PlatformAdmin, UserRole.Owner)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  list(): Promise<unknown[]> {
    return this.tenantsService.list();
  }
}

