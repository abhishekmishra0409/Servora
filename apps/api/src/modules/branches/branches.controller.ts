import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { StaffJwtPayload } from '@restaurent/shared';
import { UserRole } from '@restaurent/shared';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { StaffJwtGuard } from '../../common/guards/staff-jwt.guard';
import { AccessService } from '../../infrastructure/access/access.service';
import { BranchesService } from './branches.service';
import { CreateBranchDto, UpdateBranchDto } from './dto';

@Controller('branches')
@UseGuards(StaffJwtGuard, RolesGuard, PermissionsGuard)
export class BranchesController {
  constructor(
    private readonly accessService: AccessService,
    private readonly branchesService: BranchesService,
  ) {}

  @Get()
  @RequirePermissions('branches:view')
  @Roles(
    UserRole.PlatformAdmin,
    UserRole.Owner,
    UserRole.Manager,
    UserRole.Waiter,
    UserRole.Kitchen,
    UserRole.Cashier,
  )
  async list(@Query('tenantId') tenantId: string, @CurrentUser() user: StaffJwtPayload): Promise<unknown[]> {
    await this.accessService.assertTenantAccess(user, tenantId);
    return this.branchesService.list(tenantId);
  }

  @Post()
  @RequirePermissions('branches:add')
  async create(@Body() dto: CreateBranchDto, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    await this.accessService.assertTenantAccess(user, dto.tenantId);
    return this.branchesService.create(dto, { role: user.role, sub: user.sub });
  }

  @Delete(':id')
  @RequirePermissions('branches:delete')
  async archive(
    @Param('id') id: string,
    @CurrentUser() user: StaffJwtPayload,
  ): Promise<{ success: boolean }> {
    await this.accessService.assertBranchAccess(user, id);
    return this.branchesService.archive(id, user.sub);
  }

  @Patch(':id')
  @RequirePermissions('branches:edit')
  @Roles(UserRole.PlatformAdmin, UserRole.Owner)
  async update(@Param('id') id: string, @Body() dto: UpdateBranchDto, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    await this.accessService.assertBranchRecordAccess(user, id);
    return this.branchesService.update(id, dto, user.sub);
  }
}
