import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { StaffJwtPayload } from '@restaurent/shared';
import { OrderStatus, UserRole } from '@restaurent/shared';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StaffJwtGuard } from '../../common/guards/staff-jwt.guard';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(StaffJwtGuard, RolesGuard)
@Roles(UserRole.Owner, UserRole.Manager, UserRole.Waiter, UserRole.Kitchen)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('live')
  getLive(@Query('branchId') branchId: string): Promise<unknown> {
    return this.ordersService.getLive(branchId);
  }

  @Get(':id')
  getById(@Param('id') id: string): Promise<unknown> {
    return this.ordersService.getById(id);
  }

  @Post(':id/confirm')
  confirm(@Param('id') id: string, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    return this.ordersService.confirm(id, user.sub);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string): Promise<unknown> {
    return this.ordersService.reject(id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: OrderStatus): Promise<unknown> {
    return this.ordersService.updateStatus(id, status);
  }
}

