import { Body, Controller, Delete, Get, Patch, Post, Query, Param, UseGuards } from '@nestjs/common';
import { UserRole } from '@restaurent/shared';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StaffJwtGuard } from '../../common/guards/staff-jwt.guard';
import { CreateTableDto, RegenerateQrDto, UpdateTableDto } from './dto';
import { TablesService } from './tables.service';

@Controller('cms')
@UseGuards(StaffJwtGuard, RolesGuard)
@Roles(UserRole.Owner, UserRole.Manager, UserRole.Waiter)
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get('tables')
  list(@Query('branchId') branchId: string): Promise<unknown[]> {
    return this.tablesService.list(branchId);
  }

  @Post('tables')
  create(@Body() dto: CreateTableDto): Promise<unknown> {
    return this.tablesService.create(dto);
  }

  @Patch('tables/:id')
  update(@Param('id') id: string, @Body() dto: UpdateTableDto): Promise<unknown> {
    return this.tablesService.update(id, dto);
  }

  @Delete('tables/:id')
  delete(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.tablesService.delete(id);
  }

  @Post('qr/regenerate')
  regenerate(@Body() dto: RegenerateQrDto): Promise<{ token: string; version: number }> {
    return this.tablesService.regenerateQr(dto);
  }
}
