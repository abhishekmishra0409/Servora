import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { StaffJwtPayload } from '@restaurent/shared';
import { isPlatformRoleKey, SubscriptionStatus } from '@restaurent/shared';
import { Model } from 'mongoose';

import { Branch } from '../../database/schemas/branch.schema';
import { Floor } from '../../database/schemas/floor.schema';
import { Membership } from '../../database/schemas/membership.schema';
import { MenuCategory } from '../../database/schemas/menu-category.schema';
import { MenuItem } from '../../database/schemas/menu-item.schema';
import { Order } from '../../database/schemas/order.schema';
import { Payment } from '../../database/schemas/payment.schema';
import { Subscription } from '../../database/schemas/subscription.schema';
import { RestaurantTable } from '../../database/schemas/table.schema';
import { Tenant } from '../../database/schemas/tenant.schema';
import { EffectiveGrant, PermissionResolverService } from './permission-resolver.service';

const healthySubscriptionStatuses = [
  SubscriptionStatus.Active,
  SubscriptionStatus.GracePeriod,
  SubscriptionStatus.Trialing,
];

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
    @InjectModel(Subscription.name) private readonly subscriptionModel: Model<Subscription>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<Tenant>,
    private readonly permissionResolver: PermissionResolverService,
  ) { }

  private isGlobalAdmin(user: StaffJwtPayload): boolean {
    return isPlatformRoleKey(user.role);
  }

  async assertTenantAccess(user: StaffJwtPayload, tenantId: string, required?: readonly string[]): Promise<void> {
    if (this.isGlobalAdmin(user)) {
      await this.assertTenantSubscriptionUsable(user, tenantId);
      return;
    }

    if (user.tenantId === tenantId) {
      if (required?.length) {
        const permissions = await this.permissionResolver.resolveTenantWide(user.sub, tenantId);
        if (!required.some((permission) => permissions.has(permission))) {
          throw new ForbiddenException('Missing required permission');
        }
      }
      await this.assertTenantSubscriptionUsable(user, tenantId);
      return;
    }

    const membership = await this.membershipModel.exists({ tenantId, userId: user.sub }).exec();
    if (!membership) {
      throw new ForbiddenException('Tenant access denied');
    }

    if (required?.length) {
      const permissions = await this.permissionResolver.resolveTenantWide(user.sub, tenantId);
      if (!required.some((permission) => permissions.has(permission))) {
        throw new ForbiddenException('Missing required permission');
      }
    }

    await this.assertTenantSubscriptionUsable(user, tenantId);
  }

  /**
   * Authorises access to a branch and returns the permissions the caller
   * actually holds *there*.
   *
   * This previously short-circuited on `user.branchId === branchId` and
   * otherwise only checked that a membership existed — never its role. A user
   * who was Manager at branch A and Waiter at branch B therefore passed the
   * check for B and then operated on it with A's Manager rights. Both the
   * short-circuit and the existence-only check are gone: every branch access
   * resolves the membership covering that specific branch.
   */
  async assertBranchAccess(
    user: StaffJwtPayload,
    branchId: string,
    required?: readonly string[],
  ): Promise<EffectiveGrant> {
    if (this.isGlobalAdmin(user)) {
      await this.assertTenantSubscriptionUsable(user, user.tenantId);
      return {
        permissions: await this.permissionResolver.permissionsForRole(user.tenantId, user.role),
        roleKey: user.role,
      };
    }

    const grant = await this.permissionResolver.resolveForBranch(user.sub, user.tenantId, branchId);

    if (!grant) {
      throw new ForbiddenException('Branch access denied');
    }

    if (required?.length && !required.some((permission) => grant.permissions.has(permission))) {
      throw new ForbiddenException('Missing required permission');
    }

    await this.assertTenantSubscriptionUsable(user, user.tenantId);
    return grant;
  }

  async assertTenantActive(tenantId: string): Promise<void> {
    if (!tenantId) {
      return;
    }

    const tenant = await this.tenantModel.findById(tenantId).select('status').lean().exec();
    // Fail closed: a token referencing a deleted/unknown tenant must not pass.
    if (!tenant) {
      throw new ForbiddenException('Tenant not found');
    }

    if (tenant.status === 'active') {
      return;
    }

    // Any non-active status (including missing/empty) requires a healthy
    // subscription — previously a missing status silently granted access.
    if (tenant.status !== 'archived') {
      const hasHealthySubscription = await this.subscriptionModel
        .exists({
          provider: 'stripe',
          status: { $in: healthySubscriptionStatuses },
          $expr: { $eq: [{ $toString: '$tenantId' }, tenantId] },
        })
        .exec();

      if (hasHealthySubscription) {
        await this.tenantModel.updateOne({ _id: tenantId }, { $set: { status: 'active' } }).exec();
        return;
      }
    }

    throw new ForbiddenException('Subscription inactive. Update payment method to restore access.');
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
