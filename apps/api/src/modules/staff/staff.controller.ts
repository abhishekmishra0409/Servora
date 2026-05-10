import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { StaffJwtPayload } from '@restaurent/shared';
import { UserRole } from '@restaurent/shared';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StaffJwtGuard } from '../../common/guards/staff-jwt.guard';
import { AccessService } from '../../infrastructure/access/access.service';
import { StaffService } from './staff.service';
import { CreateStaffDto, UpdateStaffDto } from './dto';

@Controller('cms/staff')
@UseGuards(StaffJwtGuard, RolesGuard)
@Roles(UserRole.PlatformAdmin, UserRole.Owner)
export class StaffController {
  constructor(
    private readonly accessService: AccessService,
    private readonly staffService: StaffService,
  ) {}

  @Get()
  async list(@Query('branchId') branchId: string, @CurrentUser() user: StaffJwtPayload): Promise<unknown[]> {
    await this.accessService.assertBranchAccess(user, branchId);
    return this.staffService.list(branchId);
  }

  @Post()
  async create(@Body() dto: CreateStaffDto, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    await this.accessService.assertBranchAccess(user, dto.branchId);
    return this.staffService.create(dto, user);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateStaffDto, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    await this.accessService.assertStaffMembershipAccess(user, id);
    return this.staffService.update(id, dto, user);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: StaffJwtPayload): Promise<{ success: boolean }> {
    await this.accessService.assertStaffMembershipAccess(user, id);
    return this.staffService.delete(id, user.sub);
  }
}
