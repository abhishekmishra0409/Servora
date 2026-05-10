import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { StaffJwtPayload } from '@restaurent/shared';
import { UserRole } from '@restaurent/shared';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StaffJwtGuard } from '../../common/guards/staff-jwt.guard';
import { AccessService } from '../../infrastructure/access/access.service';
import { CreateFloorDto, UpdateFloorDto } from './dto';
import { FloorsService } from './floors.service';

@Controller('cms/floors')
@UseGuards(StaffJwtGuard, RolesGuard)
@Roles(UserRole.PlatformAdmin, UserRole.Owner, UserRole.Manager)
export class FloorsController {
  constructor(
    private readonly accessService: AccessService,
    private readonly floorsService: FloorsService,
  ) {}

  @Get()
  async list(@Query('branchId') branchId: string, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    await this.accessService.assertBranchAccess(user, branchId);
    return this.floorsService.list(branchId);
  }

  @Post()
  async create(@Body() dto: CreateFloorDto, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    await this.accessService.assertBranchAccess(user, dto.branchId);
    return this.floorsService.create(dto, user.sub);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFloorDto, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    await this.accessService.assertFloorAccess(user, id);
    return this.floorsService.update(id, dto, user.sub);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    await this.accessService.assertFloorAccess(user, id);
    return this.floorsService.delete(id, user.sub);
  }
}
