import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { StaffJwtPayload } from '@restaurent/shared';
import { UserRole } from '@restaurent/shared';
import { Model } from 'mongoose';

import { Branch } from '../../database/schemas/branch.schema';
import { Floor } from '../../database/schemas/floor.schema';
import { Membership } from '../../database/schemas/membership.schema';
import { MenuCategory } from '../../database/schemas/menu-category.schema';
import { MenuItem } from '../../database/schemas/menu-item.schema';
import { Order } from '../../database/schemas/order.schema';
import { Payment } from '../../database/schemas/payment.schema';
import { RestaurantTable } from '../../database/schemas/table.schema';
import { Tenant } from '../../database/schemas/tenant.schema';

@Injectable()
export class AccessService {
  constructor(
    @InjectModel(Membership.name) private readonly membershipModel: Model<Membership>,
    @InjectModel(Branch.name) private readonly branchModel: Model<Branch>,
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(Payment.name) private readonly paymentModel: Model<Payment>,
    @InjectModel(RestaurantTable.name) private readonly tableModel: Model<RestaurantTable>,
    @InjectModel(Floor.name) private readonly floorModel: Model<Floor>,
    @InjectModel(MenuItem.name) private readonly menuItemModel: Model<MenuItem>,
    @InjectModel(MenuCategory.name) private readonly menuCategoryModel: Model<MenuCategory>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<Tenant>,
  ) {}

  private isGlobalAdmin(user: StaffJwtPayload): boolean {
    return [UserRole.SuperAdmin, UserRole.PlatformAdmin].includes(user.role);
  }

  async assertTenantAccess(user: StaffJwtPayload, tenantId: string): Promise<void> {
    if (this.isGlobalAdmin(user) || user.tenantId === tenantId) {
      await this.assertTenantSubscriptionUsable(user, tenantId);
      return;
    }

    const membership = await this.membershipModel.exists({ tenantId, userId: user.sub }).exec();
    if (!membership) {
      throw new ForbiddenException('Tenant access denied');
    }
    await this.assertTenantSubscriptionUsable(user, tenantId);
  }

  async assertBranchAccess(user: StaffJwtPayload, branchId: string): Promise<void> {
    if (this.isGlobalAdmin(user) || user.branchId === branchId) {
      await this.assertTenantSubscriptionUsable(user, user.tenantId);
      return;
    }

    const membership = await this.membershipModel
      .exists({
        branchId,
        tenantId: user.tenantId,
        userId: user.sub,
      })
      .exec();

    if (!membership) {
      throw new ForbiddenException('Branch access denied');
    }
    await this.assertTenantSubscriptionUsable(user, user.tenantId);
  }

  async assertTenantActive(tenantId: string): Promise<void> {
    if (!tenantId) {
      return;
    }

    const tenant = await this.tenantModel.findById(tenantId).select('status').lean().exec();
    if (tenant?.status && tenant.status !== 'active') {
      throw new ForbiddenException('Subscription inactive. Update payment method to restore access.');
    }
  }

  private async assertTenantSubscriptionUsable(user: StaffJwtPayload, tenantId: string): Promise<void> {
    if (this.isGlobalAdmin(user) || !tenantId) {
      return;
    }

    await this.assertTenantActive(tenantId);
  }

  async assertBranchRecordAccess(user: StaffJwtPayload, branchId: string): Promise<Branch> {
    await this.assertBranchAccess(user, branchId);
    const branch = await this.branchModel.findById(branchId).lean().exec();
    if (!branch) {
      throw new ForbiddenException('Branch access denied');
    }
    return branch;
  }

  async assertOrderAccess(user: StaffJwtPayload, orderId: string): Promise<Order> {
    const order = await this.orderModel.findById(orderId).lean().exec();
    if (!order) {
      throw new ForbiddenException('Order access denied');
    }
    await this.assertBranchAccess(user, order.branchId);
    return order;
  }

  async assertPaymentAccess(user: StaffJwtPayload, paymentId: string): Promise<Payment> {
    const payment = await this.paymentModel.findById(paymentId).lean().exec();
    if (!payment) {
      throw new ForbiddenException('Payment access denied');
    }
    await this.assertBranchAccess(user, payment.branchId);
    return payment;
  }

  async assertTableAccess(user: StaffJwtPayload, tableId: string): Promise<RestaurantTable> {
    const table = await this.tableModel.findById(tableId).lean().exec();
    if (!table) {
      throw new ForbiddenException('Table access denied');
    }
    await this.assertBranchAccess(user, table.branchId);
    return table;
  }

  async assertFloorAccess(user: StaffJwtPayload, floorId: string): Promise<Floor> {
    const floor = await this.floorModel.findById(floorId).lean().exec();
    if (!floor) {
      throw new ForbiddenException('Floor access denied');
    }
    await this.assertBranchAccess(user, floor.branchId);
    return floor;
  }

  async assertStaffMembershipAccess(user: StaffJwtPayload, membershipId: string): Promise<Membership> {
    const membership = await this.membershipModel.findById(membershipId).lean().exec();
    if (!membership) {
      throw new ForbiddenException('Staff access denied');
    }
    if (membership.branchId) {
      await this.assertBranchAccess(user, membership.branchId);
    } else {
      await this.assertTenantAccess(user, membership.tenantId);
    }
    return membership;
  }

  async assertMenuItemAccess(user: StaffJwtPayload, itemId: string): Promise<MenuItem> {
    const item = await this.menuItemModel.findById(itemId).lean().exec();
    if (!item) {
      throw new ForbiddenException('Menu item access denied');
    }
    await this.assertBranchAccess(user, item.branchId);
    return item;
  }

  async assertMenuCategoryAccess(user: StaffJwtPayload, categoryId: string): Promise<MenuCategory> {
    const category = await this.menuCategoryModel.findById(categoryId).lean().exec();
    if (!category) {
      throw new ForbiddenException('Menu category access denied');
    }
    if (category.branchId) {
      await this.assertBranchAccess(user, category.branchId);
    } else {
      await this.assertTenantAccess(user, category.tenantId);
    }
    return category;
  }
}
