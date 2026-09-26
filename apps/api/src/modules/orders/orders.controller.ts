import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { StaffJwtPayload } from '@restaurent/shared';
import { OrderStatus, UserRole } from '@restaurent/shared';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { StaffJwtGuard } from '../../common/guards/staff-jwt.guard';
import { AccessService } from '../../infrastructure/access/access.service';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(StaffJwtGuard, RolesGuard, PermissionsGuard)
export class OrdersController {
  constructor(
    private readonly accessService: AccessService,
    private readonly ordersService: OrdersService,
  ) {}

  @Get('live')
  @RequirePermissions('orders:view')
  @Roles(UserRole.PlatformAdmin, UserRole.Owner, UserRole.Manager, UserRole.Waiter, UserRole.Kitchen, UserRole.Cashier)
  async getLive(@Query('branchId') branchId: string, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    await this.accessService.assertBranchAccess(user, branchId);
    return this.ordersService.getLive(branchId);
  }

  @Get('billable')
  @RequirePermissions('bills:view')
  @Roles(UserRole.PlatformAdmin, UserRole.Owner, UserRole.Manager, UserRole.Waiter, UserRole.Cashier)
  async getBillable(@Query('branchId') branchId: string, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    await this.accessService.assertBranchAccess(user, branchId);
    return this.ordersService.getBillable(branchId);
  }

  @Get(':id')
  @RequirePermissions('orders:view')
  @Roles(UserRole.PlatformAdmin, UserRole.Owner, UserRole.Manager, UserRole.Waiter, UserRole.Kitchen, UserRole.Cashier)
  async getById(@Param('id') id: string, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    await this.accessService.assertOrderAccess(user, id);
    return this.ordersService.getById(id);
  }

  @Post(':id/confirm')
  @RequirePermissions('orders:confirm')
  @Roles(UserRole.PlatformAdmin, UserRole.Owner, UserRole.Manager, UserRole.Waiter)
  async confirm(@Param('id') id: string, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    await this.accessService.assertOrderAccess(user, id);
    return this.ordersService.confirm(id, user.sub);
  }

  @Post(':id/reject')
  @RequirePermissions('orders:reject')
  @Roles(UserRole.PlatformAdmin, UserRole.Owner, UserRole.Manager, UserRole.Waiter)
  async reject(@Param('id') id: string, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    await this.accessService.assertOrderAccess(user, id);
    return this.ordersService.reject(id, user.sub);
  }

  @Patch(':id/status')
  @RequirePermissions('orders:edit', 'orders:status-preparing', 'orders:status-ready', 'orders:status-served')
  @Roles(UserRole.PlatformAdmin, UserRole.Owner, UserRole.Manager, UserRole.Waiter, UserRole.Kitchen)
  async updateStatus(@Param('id') id: string, @Body('status') status: OrderStatus, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    this.assertStatusActionAllowed(user.role, status);
    await this.accessService.assertOrderAccess(user, id);
    return this.ordersService.updateStatus(id, status, user.sub);
  }

  private assertStatusActionAllowed(role: string, status: OrderStatus): void {
    if (([UserRole.PlatformAdmin, UserRole.Owner, UserRole.Manager] as string[]).includes(role)) {
      return;
    }

    if (role === UserRole.Kitchen && [OrderStatus.Preparing, OrderStatus.Ready].includes(status)) {
      return;
    }

    if (role === UserRole.Waiter && status === OrderStatus.Served) {
      return;
    }

    throw new ForbiddenException('Order status action not allowed for role');
  }
}
