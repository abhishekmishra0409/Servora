import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { StaffJwtPayload } from '@restaurent/shared';
import { OrderStatus, UserRole } from '@restaurent/shared';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StaffJwtGuard } from '../../common/guards/staff-jwt.guard';
import { AccessService } from '../../infrastructure/access/access.service';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(StaffJwtGuard, RolesGuard)
@Roles(UserRole.Owner, UserRole.Manager, UserRole.Waiter, UserRole.Kitchen)
export class OrdersController {
  constructor(
    private readonly accessService: AccessService,
    private readonly ordersService: OrdersService,
  ) {}

  @Get('live')
  async getLive(@Query('branchId') branchId: string, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    await this.accessService.assertBranchAccess(user, branchId);
    return this.ordersService.getLive(branchId);
  }

  @Get(':id')
  async getById(@Param('id') id: string, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    await this.accessService.assertOrderAccess(user, id);
    return this.ordersService.getById(id);
  }

  @Post(':id/confirm')
  async confirm(@Param('id') id: string, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    await this.accessService.assertOrderAccess(user, id);
    return this.ordersService.confirm(id, user.sub);
  }

  @Post(':id/reject')
  async reject(@Param('id') id: string, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    await this.accessService.assertOrderAccess(user, id);
    return this.ordersService.reject(id, user.sub);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: OrderStatus, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    await this.accessService.assertOrderAccess(user, id);
    return this.ordersService.updateStatus(id, status, user.sub);
  }
}
