import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { StaffJwtPayload } from '@restaurent/shared';
import { UserRole } from '@restaurent/shared';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { StaffJwtGuard } from '../../common/guards/staff-jwt.guard';
import { AccessService } from '../../infrastructure/access/access.service';
import { StaffService } from './staff.service';
import { CreateStaffDto, UpdateStaffDto } from './dto';

@Controller('cms/staff')
@UseGuards(StaffJwtGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.PlatformAdmin, UserRole.Owner)
export class StaffController {
  constructor(
    private readonly accessService: AccessService,
    private readonly staffService: StaffService,
  ) {}

  @Get()
  @RequirePermissions('staff:view')
  async list(@Query('branchId') branchId: string, @CurrentUser() user: StaffJwtPayload): Promise<unknown[]> {
    const branch = await this.accessService.assertBranchRecordAccess(user, branchId);
    return this.staffService.list(branchId, String(branch.tenantId), user);
  }

  @Post()
  @RequirePermissions('staff:add')
  async create(@Body() dto: CreateStaffDto, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    const branch = await this.accessService.assertBranchRecordAccess(user, dto.branchId);
    if (String(branch.tenantId) !== dto.tenantId) {
      throw new ForbiddenException('Branch does not belong to tenant');
    }
    return this.staffService.create(dto, user);
  }

  @Patch(':id')
  @RequirePermissions('staff:edit')
  async update(@Param('id') id: string, @Body() dto: UpdateStaffDto, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    await this.accessService.assertStaffMembershipAccess(user, id);
    return this.staffService.update(id, dto, user);
  }

  @Delete(':id')
  @RequirePermissions('staff:delete')
  async delete(@Param('id') id: string, @CurrentUser() user: StaffJwtPayload): Promise<{ success: boolean }> {
    await this.accessService.assertStaffMembershipAccess(user, id);
    return this.staffService.delete(id, user);
  }
}
