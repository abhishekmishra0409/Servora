import { Body, Controller, Delete, Get, Patch, Post, Query, Param, UseGuards } from '@nestjs/common';
import type { StaffJwtPayload } from '@restaurent/shared';
import { UserRole } from '@restaurent/shared';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StaffJwtGuard } from '../../common/guards/staff-jwt.guard';
import { AccessService } from '../../infrastructure/access/access.service';
import { CreateTableDto, RegenerateQrDto, UpdateTableDto } from './dto';
import { TablesService } from './tables.service';

@Controller('cms')
@UseGuards(StaffJwtGuard, RolesGuard)
export class TablesController {
  constructor(
    private readonly accessService: AccessService,
    private readonly tablesService: TablesService,
  ) {}

  @Get('tables')
  @Roles(UserRole.PlatformAdmin, UserRole.Owner, UserRole.Manager, UserRole.Waiter)
  async list(@Query('branchId') branchId: string, @CurrentUser() user: StaffJwtPayload): Promise<unknown[]> {
    await this.accessService.assertBranchAccess(user, branchId);
    return this.tablesService.list(branchId);
  }

  @Post('tables')
  @Roles(UserRole.PlatformAdmin, UserRole.Owner, UserRole.Manager)
  async create(@Body() dto: CreateTableDto, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    await this.accessService.assertBranchAccess(user, dto.branchId);
    return this.tablesService.create(dto, user.sub);
  }

  @Patch('tables/:id')
  @Roles(UserRole.PlatformAdmin, UserRole.Owner, UserRole.Manager)
  async update(@Param('id') id: string, @Body() dto: UpdateTableDto, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    await this.accessService.assertTableAccess(user, id);
    return this.tablesService.update(id, dto, user.sub);
  }

  @Delete('tables/:id')
  @Roles(UserRole.PlatformAdmin, UserRole.Owner, UserRole.Manager)
  async delete(@Param('id') id: string, @CurrentUser() user: StaffJwtPayload): Promise<{ success: boolean }> {
    await this.accessService.assertTableAccess(user, id);
    return this.tablesService.delete(id, user.sub);
  }

  @Post('qr/regenerate')
  @Roles(UserRole.PlatformAdmin, UserRole.Owner, UserRole.Manager)
  async regenerate(@Body() dto: RegenerateQrDto, @CurrentUser() user: StaffJwtPayload): Promise<{ token: string; version: number }> {
    await this.accessService.assertTableAccess(user, dto.tableId);
    return this.tablesService.regenerateQr(dto, user.sub);
  }
}
