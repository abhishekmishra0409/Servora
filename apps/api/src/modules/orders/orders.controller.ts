import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { StaffJwtPayload } from '@restaurent/shared';
import { isPlatformRoleKey, OrderStatus, UserRole } from '@restaurent/shared';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { StaffJwtGuard } from '../../common/guards/staff-jwt.guard';
import { AccessService } from '../../infrastructure/access/access.service';
import { PermissionResolverService } from '../../infrastructure/access/permission-resolver.service';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(StaffJwtGuard, RolesGuard, PermissionsGuard)
export class OrdersController {
  constructor(
    private readonly accessService: AccessService,
    private readonly ordersService: OrdersService,
    private readonly permissionResolver: PermissionResolverService,
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
    await this.assertStatusActionAllowed(user, status);
    await this.accessService.assertOrderAccess(user, id);
    return this.ordersService.updateStatus(id, status, user.sub);
  }

  /**
   * Each transition needs its own permission, so tenant-defined roles work the
   * same as built-ins: kitchen-style roles hold status-preparing/ready, floor
   * roles hold status-served, and orders:edit covers the rest.
   */
  private async assertStatusActionAllowed(user: StaffJwtPayload, status: OrderStatus): Promise<void> {
    if (isPlatformRoleKey(user.role)) {
      return;
    }

    const statusPermission: Partial<Record<OrderStatus, string>> = {
      [OrderStatus.Preparing]: 'orders:status-preparing',
      [OrderStatus.Ready]: 'orders:status-ready',
      [OrderStatus.Served]: 'orders:status-served',
    };
    const required = statusPermission[status] ?? 'orders:edit';
    const permissions = await this.permissionResolver.resolveTenantWide(user.sub, user.tenantId);

    if (!permissions.has(required)) {
      throw new ForbiddenException('Order status action not allowed for role');
    }
  }
}
