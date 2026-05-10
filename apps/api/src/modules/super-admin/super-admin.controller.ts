import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { StaffJwtPayload } from '@restaurent/shared';
import { UserRole } from '@restaurent/shared';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StaffJwtGuard } from '../../common/guards/staff-jwt.guard';
import {
  CreateTenantDto,
  UpdatePlanSettingsDto,
  UpdateTenantDto,
  UpdateTenantFeaturesDto,
  UpdateTenantStatusDto,
} from './dto';
import { SuperAdminService } from './super-admin.service';

@Controller('super-admin')
@UseGuards(StaffJwtGuard, RolesGuard)
@Roles(UserRole.SuperAdmin, UserRole.PlatformAdmin)
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get('tenants')
  listTenants(): Promise<unknown[]> {
    return this.superAdminService.listTenants();
  }

  @Post('tenants')
  createTenant(@Body() dto: CreateTenantDto, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    return this.superAdminService.createTenant(dto, user);
  }

  @Get('tenants/:id')
  getTenant(
    @Param('id') id: string,
    @Query('auditLimit') auditLimit?: string,
    @Query('auditPage') auditPage?: string,
  ): Promise<unknown> {
    return this.superAdminService.getTenant(id, { auditLimit: Number(auditLimit), auditPage: Number(auditPage) });
  }

  @Patch('tenants/:id')
  updateTenant(
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
    @CurrentUser() user: StaffJwtPayload,
  ): Promise<unknown> {
    return this.superAdminService.updateTenant(id, dto, user);
  }

  @Patch('tenants/:id/status')
  updateTenantStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTenantStatusDto,
    @CurrentUser() user: StaffJwtPayload,
  ): Promise<unknown> {
    return this.superAdminService.updateTenantStatus(id, dto, user);
  }

  @Patch('tenants/:id/features')
  updateTenantFeatures(
    @Param('id') id: string,
    @Body() dto: UpdateTenantFeaturesDto,
    @CurrentUser() user: StaffJwtPayload,
  ): Promise<unknown> {
    return this.superAdminService.updateTenantFeatures(id, dto, user);
  }

  @Get('plans')
  listPlans(): Promise<unknown[]> {
    return this.superAdminService.listPlans();
  }

  @Patch('plans/:code/settings')
  updatePlanSettings(
    @Param('code') code: string,
    @Body() dto: UpdatePlanSettingsDto,
    @CurrentUser() user: StaffJwtPayload,
  ): Promise<unknown> {
    return this.superAdminService.updatePlanSettings(code, dto, user);
  }
}
