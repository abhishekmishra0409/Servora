import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  BranchServiceMode,
  DEFAULT_TENANT_FEATURES,
  SubscriptionStatus,
  UserRole,
  slugify,
  type StaffJwtPayload,
} from '@restaurent/shared';
import { Model, Types } from 'mongoose';

import { hashValue } from '../../common/utils/hash';
import { AuditLog } from '../../database/schemas/audit-log.schema';
import { Branch } from '../../database/schemas/branch.schema';
import { Membership } from '../../database/schemas/membership.schema';
import { Order } from '../../database/schemas/order.schema';
import { Subscription } from '../../database/schemas/subscription.schema';
import { Tenant } from '../../database/schemas/tenant.schema';
import { User } from '../../database/schemas/user.schema';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { BillingService } from '../billing/billing.service';
import {
  CreateTenantDto,
  UpdatePlanSettingsDto,
  UpdateTenantDto,
  UpdateTenantFeaturesDto,
  UpdateTenantStatusDto,
} from './dto';

type LeanRecord = Record<string, any>;
interface AuditPageOptions {
  auditLimit?: number;
  auditPage?: number;
}

@Injectable()
export class SuperAdminService {
  constructor(
    @InjectModel(Tenant.name) private readonly tenantModel: Model<Tenant>,
    @InjectModel(Subscription.name) private readonly subscriptionModel: Model<Subscription>,
    @InjectModel(Branch.name) private readonly branchModel: Model<Branch>,
    @InjectModel(Membership.name) private readonly membershipModel: Model<Membership>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(AuditLog.name) private readonly auditLogModel: Model<AuditLog>,
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    private readonly billingService: BillingService,
    private readonly auditService: AuditService,
  ) {}

  async listTenants(): Promise<unknown[]> {
    const tenants = await this.tenantModel.find().sort({ createdAt: -1 }).lean<LeanRecord[]>().exec();
    await Promise.all(tenants.map((tenant) => this.billingService.syncTenantSubscriptionFromStripe(String(tenant._id))));
    const refreshedTenants = await this.tenantModel.find().sort({ createdAt: -1 }).lean<LeanRecord[]>().exec();
    return this.buildTenantSummaries(refreshedTenants);
  }

  async getTenant(id: string, options: AuditPageOptions = {}): Promise<unknown> {
    await this.billingService.syncTenantSubscriptionFromStripe(id);
    const tenant = await this.tenantModel.findById(id).lean<LeanRecord>().exec();
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const [summary] = await this.buildTenantSummaries([tenant]);
    return this.buildTenantDetail(summary as LeanRecord, options);
  }

  listPlans(): Promise<unknown[]> {
    return this.billingService.listConfiguredPlans({ includeHidden: true });
  }

  async updatePlanSettings(code: string, dto: UpdatePlanSettingsDto, user: StaffJwtPayload): Promise<unknown> {
    const settings = {
      ...dto,
      ...(dto.perks ? { perks: dto.perks.map((item) => item.trim()).filter(Boolean) } : {}),
    };
    const plan = await this.billingService.updatePlanSettings(code, settings);
    await this.auditService.record({
      action: 'platform.subscription_plan_settings_updated',
      actorUserId: user.sub,
      entityId: code,
      entityType: 'subscription_plan',
      payload: settings as Record<string, unknown>,
      tenantId: 'platform',
    });
    return plan;
  }

  async createTenant(dto: CreateTenantDto, user: StaffJwtPayload): Promise<unknown> {
    const slug = dto.slug?.trim() || slugify(dto.legalName);
    await this.assertSlugAvailable(slug);

    const ownerEmail = dto.ownerEmail.trim().toLowerCase();
    const existingOwner = await this.userModel.exists({ email: ownerEmail }).exec();
    if (existingOwner) {
      throw new BadRequestException('Owner email is already in use');
    }

    const tenant = await this.tenantModel.create({
      defaultCurrency: dto.defaultCurrency?.trim() || 'INR',
      defaultTimezone: dto.defaultTimezone?.trim() || 'Asia/Kolkata',
      enabledFeatures: this.uniqueFeatures(dto.enabledFeatures ?? DEFAULT_TENANT_FEATURES),
      legalName: dto.legalName.trim(),
      slug,
      status: dto.status ?? 'suspended',
    });

    const branch = await this.branchModel.create({
      address: {},
      hours: {},
      name: 'Main Branch',
      serviceMode: BranchServiceMode.Hybrid,
      slug: 'main',
      tenantId: String(tenant._id),
    });

    const owner = await this.userModel.create({
      active: true,
      email: ownerEmail,
      name: dto.ownerName?.trim() || `${tenant.legalName} Owner`,
      passwordHash: await hashValue(dto.ownerPassword),
    });

    await this.membershipModel.create({
      branchId: String(branch._id),
      role: UserRole.Owner,
      tenantId: String(tenant._id),
      userId: String(owner._id),
    });

    await this.auditService.record({
      action: 'platform.tenant_created',
      actorUserId: user.sub,
      entityId: String(tenant._id),
      entityType: 'tenant',
      payload: { defaultBranchId: String(branch._id), ownerUserId: String(owner._id), slug: tenant.slug },
      tenantId: String(tenant._id),
    });

    await this.auditService.record({
      action: 'platform.tenant_owner_provisioned',
      actorUserId: user.sub,
      branchId: String(branch._id),
      entityId: String(owner._id),
      entityType: 'user',
      payload: { email: owner.email, role: UserRole.Owner },
      tenantId: String(tenant._id),
    });

    return this.getTenant(String(tenant._id));
  }

  async updateTenant(id: string, dto: UpdateTenantDto, user: StaffJwtPayload): Promise<unknown> {
    const update: Record<string, unknown> = {};
    if (dto.legalName) update.legalName = dto.legalName.trim();
    if (dto.defaultCurrency) update.defaultCurrency = dto.defaultCurrency.trim();
    if (dto.defaultTimezone) update.defaultTimezone = dto.defaultTimezone.trim();
    if (dto.status) update.status = dto.status;
    if (dto.slug) {
      await this.assertSlugAvailable(dto.slug, id);
      update.slug = dto.slug;
    }

    const tenant = await this.tenantModel
      .findByIdAndUpdate(id, { $set: update }, { returnDocument: 'after' })
      .lean<LeanRecord>()
      .exec();

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    await this.auditService.record({
      action: 'platform.tenant_updated',
      actorUserId: user.sub,
      entityId: String(tenant._id),
      entityType: 'tenant',
      payload: update,
      tenantId: String(tenant._id),
    });

    return this.getTenant(String(tenant._id));
  }

  async updateTenantStatus(id: string, dto: UpdateTenantStatusDto, user: StaffJwtPayload): Promise<unknown> {
    return this.updateTenant(id, { status: dto.status }, user);
  }

  async updateTenantFeatures(id: string, dto: UpdateTenantFeaturesDto, user: StaffJwtPayload): Promise<unknown> {
    const enabledFeatures = this.uniqueFeatures(dto.enabledFeatures);
    const tenant = await this.tenantModel
      .findByIdAndUpdate(id, { $set: { enabledFeatures } }, { returnDocument: 'after' })
      .lean<LeanRecord>()
      .exec();

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    await this.auditService.record({
      action: 'platform.tenant_features_updated',
      actorUserId: user.sub,
      entityId: String(tenant._id),
      entityType: 'tenant',
      payload: { enabledFeatures },
      tenantId: String(tenant._id),
    });

    return this.getTenant(String(tenant._id));
  }

  private async buildTenantSummaries(tenants: LeanRecord[]): Promise<unknown[]> {
    const tenantIds = tenants.map((tenant) => String(tenant._id));
    const healthyStatuses = [
      SubscriptionStatus.Active,
      SubscriptionStatus.GracePeriod,
      SubscriptionStatus.Trialing,
    ];
    const subscriptions = tenantIds.length
      ? await this.subscriptionModel
        .aggregate<LeanRecord>([
          {
            $match: {
              $expr: {
                $in: [{ $toString: '$tenantId' }, tenantIds],
              },
            },
          },
          {
            $addFields: {
              healthyRank: { $cond: [{ $in: ['$status', healthyStatuses] }, 0, 1] },
              tenantKey: { $toString: '$tenantId' },
            },
          },
          { $sort: { tenantKey: 1, healthyRank: 1, updatedAt: -1, createdAt: -1 } },
        ])
        .exec()
      : [];

    const latestSubscriptionMap = new Map<string, LeanRecord>();
    for (const subscription of subscriptions) {
      const key = String(subscription.tenantKey ?? subscription.tenantId);
      if (!latestSubscriptionMap.has(key)) {
        const { healthyRank: _healthyRank, tenantKey: _tenantKey, ...document } = subscription;
        latestSubscriptionMap.set(key, document);
      }
    }

    const plans = await this.billingService.listConfiguredPlans({ includeHidden: true });
    const planMap = new Map(plans.map((plan) => [plan.code, plan]));

    return tenants.map((tenant) => {
      const id = String(tenant._id);
      const subscription = latestSubscriptionMap.get(id);
      return {
        tenant: this.serializeTenant(tenant),
        subscription: subscription ? this.serializeDocument(subscription) : null,
        plan: subscription ? planMap.get(subscription.planCode) ?? null : null,
      };
    });
  }

  private async buildTenantDetail(summary: LeanRecord, options: AuditPageOptions = {}): Promise<LeanRecord> {
    const tenantId = String(summary.tenant.id ?? summary.tenant._id);
    const auditPage = Number.isFinite(options.auditPage) && options.auditPage ? Math.max(1, Math.trunc(options.auditPage)) : 1;
    const auditLimit = Number.isFinite(options.auditLimit) && options.auditLimit
      ? Math.min(50, Math.max(5, Math.trunc(options.auditLimit)))
      : 10;
    const [branches, memberships, auditLogTotal, auditLogs, restaurantRevenue] = await Promise.all([
      this.branchModel.find({ tenantId }).sort({ createdAt: 1 }).lean<LeanRecord[]>().exec(),
      this.membershipModel.find({ tenantId }).sort({ role: 1 }).lean<LeanRecord[]>().exec(),
      this.auditLogModel.countDocuments({ tenantId }).exec(),
      this.auditLogModel
        .find({ tenantId })
        .sort({ createdAt: -1 })
        .skip((auditPage - 1) * auditLimit)
        .limit(auditLimit)
        .lean<LeanRecord[]>()
        .exec(),
      this.buildRestaurantRevenueSnapshot(tenantId),
    ]);

    const branchMap = new Map(branches.map((branch) => [String(branch._id), branch]));
    const userIds = [...new Set(memberships.map((membership) => String(membership.userId)))];
    const users = await this.userModel.find({ _id: { $in: userIds } }).lean<LeanRecord[]>().exec();
    const userMap = new Map(users.map((employee) => [String(employee._id), employee]));
    const employees = memberships.map((membership) => {
      const employee = userMap.get(String(membership.userId));
      const branchId = membership.branchId ? String(membership.branchId) : '';
      const branch = branchId ? branchMap.get(branchId) : null;

      return {
        active: employee?.active ?? false,
        branchId,
        branchName: branch?.name ?? 'All branches',
        email: employee?.email ?? '',
        id: String(membership._id),
        lastActive: employee?.updatedAt,
        name: employee?.name ?? 'Unknown employee',
        role: membership.role,
        userId: String(membership.userId),
      };
    });

    return {
      ...summary,
      auditLogPagination: {
        limit: auditLimit,
        page: auditPage,
        total: auditLogTotal,
        totalPages: Math.max(1, Math.ceil(auditLogTotal / auditLimit)),
      },
      auditLogs: auditLogs.map((entry) => this.serializeDocument(entry)),
      branches: branches.map((branch) => this.serializeDocument(branch)),
      business: this.buildBusinessSnapshot(summary, branches, employees, auditLogTotal, restaurantRevenue),
      employees,
    };
  }

  private buildBusinessSnapshot(
    summary: LeanRecord,
    branches: LeanRecord[],
    employees: LeanRecord[],
    auditLogTotal: number,
    restaurantRevenue: LeanRecord,
  ): LeanRecord {
    const subscriptionStatus = summary.subscription?.status ?? 'not_started';
    const currentMrr = ['trialing', 'active', 'grace_period'].includes(subscriptionStatus)
      ? Number(summary.plan?.monthlyPrice ?? 0)
      : 0;
    const createdAt = summary.tenant.createdAt ? new Date(summary.tenant.createdAt) : new Date();
    const monthsLive = Number.isNaN(createdAt.getTime())
      ? 1
      : Math.max(1, Math.ceil((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30)));

    return {
      annualizedRevenue: currentMrr * 12,
      auditEntryCount: auditLogTotal,
      branchCount: branches.length,
      currentMrr,
      employeeCount: employees.length,
      enabledFeatureCount: summary.tenant.enabledFeatures?.length ?? 0,
      lifetimeValue: currentMrr * monthsLive,
      planName: summary.plan?.name ?? 'No plan',
      renewsAt: summary.subscription?.renewsAt,
      restaurantAverageOrderValue: restaurantRevenue.averageOrderValue,
      restaurantOrderCount: restaurantRevenue.orderCount,
      restaurantRevenue: restaurantRevenue.totalRevenue,
      restaurantRevenueThisMonth: restaurantRevenue.currentMonthRevenue,
      restaurantThisMonthOrderCount: restaurantRevenue.currentMonthOrderCount,
      subscriptionStatus,
    };
  }

  private async buildRestaurantRevenueSnapshot(tenantId: string): Promise<LeanRecord> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const tenantMatchId = Types.ObjectId.isValid(tenantId) ? new Types.ObjectId(tenantId) : tenantId;
    const match = { status: { $ne: 'rejected' }, tenantId: tenantMatchId };
    const [allTime, currentMonth] = await Promise.all([
      this.orderModel
        .aggregate([
          { $match: match },
          {
            $group: {
              _id: null,
              averageOrderValue: { $avg: '$grandTotal' },
              orderCount: { $sum: 1 },
              totalRevenue: { $sum: '$grandTotal' },
            },
          },
        ])
        .exec(),
      this.orderModel
        .aggregate([
          { $match: { ...match, submittedAt: { $gte: startOfMonth } } },
          {
            $group: {
              _id: null,
              currentMonthOrderCount: { $sum: 1 },
              currentMonthRevenue: { $sum: '$grandTotal' },
            },
          },
        ])
        .exec(),
    ]);
    const allTimeStats = allTime[0] ?? {};
    const currentMonthStats = currentMonth[0] ?? {};

    return {
      averageOrderValue: Math.round(Number(allTimeStats.averageOrderValue ?? 0)),
      currentMonthOrderCount: Number(currentMonthStats.currentMonthOrderCount ?? 0),
      currentMonthRevenue: Number(currentMonthStats.currentMonthRevenue ?? 0),
      orderCount: Number(allTimeStats.orderCount ?? 0),
      totalRevenue: Number(allTimeStats.totalRevenue ?? 0),
    };
  }

  private async assertSlugAvailable(slug: string, exceptTenantId?: string): Promise<void> {
    const existing = await this.tenantModel.findOne({ slug }).lean().exec();
    if (existing && String(existing._id) !== exceptTenantId) {
      throw new BadRequestException('Tenant slug is already in use');
    }
  }

  private uniqueFeatures(features: string[]): string[] {
    return [...new Set(features)];
  }

  private serializeTenant(document: LeanRecord): LeanRecord {
    return {
      ...this.serializeDocument(document),
      enabledFeatures:
        Array.isArray(document.enabledFeatures) && document.enabledFeatures.length
          ? document.enabledFeatures
          : DEFAULT_TENANT_FEATURES,
    };
  }

  private serializeDocument(document: LeanRecord): LeanRecord {
    return {
      ...document,
      _id: String(document._id),
      id: String(document._id),
      ...(document.actorUserId ? { actorUserId: String(document.actorUserId) } : {}),
      ...(document.branchId ? { branchId: String(document.branchId) } : {}),
      ...(document.tenantId ? { tenantId: String(document.tenantId) } : {}),
      ...(document.userId ? { userId: String(document.userId) } : {}),
    };
  }
}
