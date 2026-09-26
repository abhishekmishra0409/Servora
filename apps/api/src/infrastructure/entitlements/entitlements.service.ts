import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  ENTITLED_RESOURCES,
  isLimitReached,
  isPlanCode,
  PLAN_DEFAULTS,
  PLAN_LIMIT_ERROR_CODE,
  RESOURCE_LABELS,
  type EntitledResource,
  type PlanLimits,
  type TenantEntitlements,
} from '@restaurent/shared';
import { Model } from 'mongoose';

import { Membership } from '../../database/schemas/membership.schema';
import { MenuItem } from '../../database/schemas/menu-item.schema';
import { Payment } from '../../database/schemas/payment.schema';
import { Role } from '../../database/schemas/role.schema';
import { Subscription } from '../../database/schemas/subscription.schema';
import { SubscriptionPlan } from '../../database/schemas/subscription-plan.schema';
import { Branch } from '../../database/schemas/branch.schema';
import { RestaurantTable } from '../../database/schemas/table.schema';
import { Tenant } from '../../database/schemas/tenant.schema';

const CACHE_TTL_MS = 60_000;

interface CacheEntry {
  expiresAt: number;
  value: TenantEntitlements;
}

/**
 * Resolves what a tenant's subscription entitles them to, and refuses creates
 * that would exceed it.
 *
 * Two things this deliberately does differently from the per-service checks it
 * replaces:
 *
 * 1. It reads only local Mongo. The old `assertEmployeeLimit`/`assertTableLimit`
 *    path called `getTenantBillingPlan`, which hit Stripe live on every single
 *    create and swallowed failures — so a Stripe outage silently removed all
 *    limits. Stripe stays where it belongs: webhooks and the billing screens.
 * 2. Limits only ever block *new* records. Nothing here deactivates or hides
 *    what a tenant already has, so a downgrade never locks staff out mid-shift.
 */
@Injectable()
export class EntitlementsService {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    @InjectModel(Subscription.name) private readonly subscriptionModel: Model<Subscription>,
    @InjectModel(SubscriptionPlan.name) private readonly planModel: Model<SubscriptionPlan>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<Tenant>,
    @InjectModel(Membership.name) private readonly membershipModel: Model<Membership>,
    @InjectModel(Branch.name) private readonly branchModel: Model<Branch>,
    @InjectModel(RestaurantTable.name) private readonly tableModel: Model<RestaurantTable>,
    @InjectModel(Payment.name) private readonly paymentModel: Model<Payment>,
    @InjectModel(MenuItem.name) private readonly menuItemModel: Model<MenuItem>,
    @InjectModel(Role.name) private readonly roleModel: Model<Role>,
  ) {}

  async getEntitlements(tenantId: string): Promise<TenantEntitlements> {
    const cached = this.cache.get(tenantId);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const [subscription, tenant] = await Promise.all([
      this.subscriptionModel.findOne({ tenantId }).sort({ updatedAt: -1 }).lean().exec(),
      this.tenantModel.findById(tenantId).select('entitlementOverrides').lean().exec(),
    ]);

    // A tenant with no subscription falls back to the most restrictive plan
    // rather than to "unlimited", which is what the previous null-plan path
    // did. Access is separately gated by AccessService.assertTenantActive.
    const rawCode = subscription?.planCode ?? '';
    const planCode = isPlanCode(rawCode) ? rawCode : 'launch';
    const defaults = PLAN_DEFAULTS[planCode];
    const plan = await this.planModel.findOne({ code: planCode }).lean().exec();

    const overrides = (tenant?.entitlementOverrides ?? {}) as Record<string, unknown>;
    const limits = {} as PlanLimits;

    for (const resource of ENTITLED_RESOURCES) {
      limits[resource] = this.pickLimit(
        resource,
        overrides,
        plan as Record<string, unknown> | null,
        defaults.limits[resource],
      );
    }

    const features = Array.isArray(overrides.features)
      ? (overrides.features as string[])
      : plan?.features?.length
        ? plan.features
        : defaults.features;

    const value: TenantEntitlements = {
      features,
      limits,
      planCode,
      planName: plan?.name ?? planCode,
      source: subscription ? (Object.keys(overrides).length > 0 ? 'override' : 'plan') : 'fallback',
      usage: {},
    };

    this.cache.set(tenantId, { expiresAt: Date.now() + CACHE_TTL_MS, value });
    return value;
  }

  /** Entitlements plus a live usage count, for the owner-facing meters. */
  async getEntitlementsWithUsage(tenantId: string): Promise<TenantEntitlements> {
    const [entitlements, usage] = await Promise.all([
      this.getEntitlements(tenantId),
      this.getUsage(tenantId),
    ]);

    return { ...entitlements, usage };
  }

  async getUsage(tenantId: string): Promise<Record<EntitledResource, number>> {
    const [employees, branches, tables, monthlyBills, menuItems, customRoles] = await Promise.all([
      this.membershipModel.countDocuments({ tenantId }).exec(),
      this.branchModel.countDocuments({ status: { $ne: 'archived' }, tenantId }).exec(),
      this.tableModel.countDocuments({ tenantId }).exec(),
      this.paymentModel.countDocuments({ createdAt: { $gte: startOfMonth() }, tenantId }).exec(),
      this.menuItemModel.countDocuments({ tenantId }).exec(),
      this.roleModel.countDocuments({ active: true, tenantId }).exec(),
    ]);

    return { branches, customRoles, employees, menuItems, monthlyBills, tables };
  }

  /**
   * Refuses a create that would exceed the tenant's cap.
   *
   * Throws a structured payload so the CMS can tell a plan limit apart from a
   * permission denial without matching on the message text.
   */
  async assertCanCreate(tenantId: string, resource: EntitledResource): Promise<void> {
    const entitlements = await this.getEntitlements(tenantId);
    const limit = entitlements.limits[resource];

    if (limit <= 0) {
      return;
    }

    const used = (await this.getUsage(tenantId))[resource];

    if (isLimitReached(used, limit)) {
      throw new ForbiddenException({
        code: PLAN_LIMIT_ERROR_CODE,
        details: { limit, planCode: entitlements.planCode, resource, used },
        message: `Your plan allows up to ${limit} ${RESOURCE_LABELS[resource].toLowerCase()}. Upgrade to add more.`,
        statusCode: 403,
      });
    }
  }

  async assertFeature(tenantId: string, feature: string): Promise<void> {
    const entitlements = await this.getEntitlements(tenantId);

    if (!entitlements.features.includes(feature)) {
      throw new ForbiddenException({
        code: PLAN_LIMIT_ERROR_CODE,
        details: { limit: 0, planCode: entitlements.planCode, resource: feature, used: 0 },
        message: 'Your plan does not include this feature. Upgrade to enable it.',
        statusCode: 403,
      });
    }
  }

  invalidate(tenantId: string): void {
    this.cache.delete(tenantId);
  }

  /** A plan settings change affects every tenant on it, so drop everything. */
  invalidateAll(): void {
    this.cache.clear();
  }

  private pickLimit(
    resource: EntitledResource,
    overrides: Record<string, unknown>,
    plan: Record<string, unknown> | null,
    fallback: number,
  ): number {
    const override = overrides[resource];

    if (typeof override === 'number' && Number.isFinite(override)) {
      return override;
    }

    const planValue = plan?.[PLAN_FIELD[resource]];

    return typeof planValue === 'number' && Number.isFinite(planValue) ? planValue : fallback;
  }
}

/** SubscriptionPlan stores each limit under its own legacy field name. */
const PLAN_FIELD: Record<EntitledResource, string> = {
  branches: 'branchLimit',
  customRoles: 'customRoleLimit',
  employees: 'employeeLimit',
  menuItems: 'menuItemLimit',
  monthlyBills: 'monthlyBillLimit',
  tables: 'tableLimit',
};

const startOfMonth = (): Date => {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
};
