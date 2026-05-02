import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@restaurent/shared';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StaffJwtGuard } from '../../common/guards/staff-jwt.guard';
import { StaffService } from './staff.service';
import { CreateStaffDto, UpdateStaffDto } from './dto';

@Controller('cms/staff')
@UseGuards(StaffJwtGuard, RolesGuard)
@Roles(UserRole.Owner, UserRole.Manager)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  list(@Query('branchId') branchId: string): Promise<unknown[]> {
    return this.staffService.list(branchId);
  }

  @Post()
  create(@Body() dto: CreateStaffDto): Promise<unknown> {
    return this.staffService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateStaffDto): Promise<unknown> {
    return this.staffService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.staffService.delete(id);
  }
}
