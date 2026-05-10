import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import Stripe from 'stripe';
import { Model } from 'mongoose';
import { SubscriptionStatus } from '@restaurent/shared';

import { Subscription } from '../../database/schemas/subscription.schema';
import { SubscriptionPlan } from '../../database/schemas/subscription-plan.schema';
import { Tenant } from '../../database/schemas/tenant.schema';
import { CheckoutSessionDto, CustomerPortalDto } from './dto';

type StripeClient = InstanceType<typeof Stripe>;
type StripePrice = Record<string, any>;
type PlanCode = 'enterprise' | 'growth' | 'launch';
type LeanSubscription = Subscription & {
  _id?: unknown;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export interface BillingPlan {
  active: boolean;
  badge: string;
  branchLimit: number;
  code: PlanCode;
  currency: string;
  description: string;
  employeeLimit: number;
  interval?: string;
  monthlyBillLimit: number;
  monthlyPrice: number;
  name: string;
  perks: string[];
  sortOrder: number;
  stripePriceId?: string;
  stripeProductId?: string;
  visible: boolean;
  tableLimit: number;
}

const planLabels: Record<PlanCode, string> = {
  enterprise: 'Enterprise',
  growth: 'Growth',
  launch: 'Launch',
};

const defaultPlanSettings: Record<PlanCode, Omit<
  BillingPlan,
  'active' | 'currency' | 'interval' | 'monthlyPrice' | 'name' | 'stripePriceId' | 'stripeProductId'
>> = {
  enterprise: {
    badge: 'Scale',
    branchLimit: 0,
    code: 'enterprise',
    description: 'For multi-location restaurants that need scale, controls, and priority support.',
    employeeLimit: 0,
    monthlyBillLimit: 0,
    perks: [
      'Unlimited employees and branches',
      'Unlimited QR bills and payment requests',
      'Advanced analytics and audit logs',
      'Priority onboarding and support',
      'Custom workflow and permission setup',
    ],
    sortOrder: 3,
    tableLimit: 0,
    visible: true,
  },
  growth: {
    badge: 'Popular',
    branchLimit: 3,
    code: 'growth',
    description: 'For growing restaurants with more staff, higher billing volume, and stronger analytics.',
    employeeLimit: 25,
    monthlyBillLimit: 1500,
    perks: [
      'Up to 25 employee accounts',
      'Up to 3 branches and 150 tables',
      '1,500 bill/payment requests per month',
      'Kitchen board, waiter workflows, and service requests',
      'Analytics, audit logs, and menu scheduling',
    ],
    sortOrder: 2,
    tableLimit: 150,
    visible: true,
  },
  launch: {
    badge: 'Starter',
    branchLimit: 1,
    code: 'launch',
    description: 'For a single restaurant starting with QR ordering, billing, and basic staff operations.',
    employeeLimit: 8,
    monthlyBillLimit: 300,
    perks: [
      'Up to 8 employee accounts',
      '1 branch and 40 tables',
      '300 bill/payment requests per month',
      'QR menu, table sessions, and order tracking',
      'Basic support and platform updates',
    ],
    sortOrder: 1,
    tableLimit: 40,
    visible: true,
  },
};

const healthySubscriptionStatuses = new Set<string>([
  SubscriptionStatus.Active,
  SubscriptionStatus.GracePeriod,
  SubscriptionStatus.Trialing,
]);

@Injectable()
export class BillingService {
  private readonly stripe: StripeClient | undefined;
  private readonly stripeSecretKey: string;

  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<Subscription>,
    @InjectModel(SubscriptionPlan.name)
    private readonly planModel: Model<SubscriptionPlan>,
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<Tenant>,
    private readonly configService: ConfigService,
  ) {
    this.stripeSecretKey = this.configService.get<string>('billing.stripe.secretKey', '').trim();
    this.stripe = this.stripeSecretKey
      ? new Stripe(this.stripeSecretKey, { apiVersion: '2026-02-25.clover' as any })
      : undefined;
  }

  getProviderName(): 'stripe' {
    return 'stripe';
  }

  async summary(tenantId: string): Promise<unknown> {
    const [subscription, allPlans] = await Promise.all([
      this.syncTenantSubscriptionFromStripe(tenantId),
      this.listConfiguredPlans({ includeHidden: true }),
    ]);
    const plan = subscription
      ? allPlans.find((item) => item.code === subscription.planCode) ?? null
      : null;
    const plans = allPlans.filter((item) => item.visible);
    if (!subscription) {
      await this.reconcileTenantSubscriptionState(tenantId);
    }

    return {
      paymentRequired: subscription ? !this.isHealthySubscriptionStatus(subscription.status) : true,
      plan,
      plans,
      subscription,
    };
  }

  async createCheckoutSession(dto: CheckoutSessionDto): Promise<{ provider: string; url: string }> {
    const provider = this.getProviderName();
    const plan = await this.resolveConfiguredPlan(dto.planCode);
    if (!plan.visible) {
      throw new BadRequestException('This subscription plan is not available');
    }
    if (!plan.active) {
      throw new BadRequestException('This subscription plan is not active in Stripe');
    }

    if (this.stripe && plan.stripePriceId) {
      const session = await this.stripe.checkout.sessions.create({
        cancel_url: `${this.getWebUrl()}/subscription?checkout=cancelled`,
        client_reference_id: dto.tenantId,
        line_items: [{ price: plan.stripePriceId, quantity: 1 }],
        metadata: {
          planCode: dto.planCode,
          tenantId: dto.tenantId,
        },
        mode: 'subscription',
        subscription_data: {
          metadata: {
            planCode: dto.planCode,
            tenantId: dto.tenantId,
          },
        },
        success_url: `${this.getWebUrl()}/subscription?checkout=success`,
      });

      if (session.url) {
        return {
          provider,
          url: session.url,
        };
      }
    }

    if (process.env.NODE_ENV === 'production') {
      throw new ServiceUnavailableException('Stripe checkout is not configured for this plan');
    }

    return {
      provider,
      url: `https://dashboard.stripe.com/test/payments?plan=${dto.planCode}&tenant=${dto.tenantId}`,
    };
  }

  async createCustomerPortal(dto: CustomerPortalDto): Promise<{ provider: string; url: string }> {
    const provider = this.getProviderName();

    if (this.stripe) {
      const subscription = await this.syncTenantSubscriptionFromStripe(dto.tenantId);

      if (subscription?.providerCustomerId) {
        const session = await this.stripe.billingPortal.sessions.create({
          customer: subscription.providerCustomerId,
          return_url: `${this.getWebUrl()}/subscription`,
        });

        return {
          provider,
          url: session.url,
        };
      }

      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException('No Stripe customer exists for this tenant yet');
      }
    }

    return {
      provider,
      url: `https://billing.stripe.com/p/login/test_customer_${dto.tenantId}`,
    };
  }

  async upsertSubscriptionFromWebhook(
    provider: 'stripe',
    payload: Record<string, unknown>,
  ): Promise<{ provider: string; updated: boolean }> {
    const providerSubscriptionId = String(payload.subscriptionId ?? payload.subscription_id ?? payload.id ?? '');
    const existing = providerSubscriptionId
      ? await this.subscriptionModel.findOne({ provider, providerSubscriptionId }).lean().exec()
      : null;
    const tenantId = String(payload.tenantId ?? payload.tenant_id ?? payload.client_reference_id ?? existing?.tenantId ?? '');

    if (!providerSubscriptionId.startsWith('sub_') || !tenantId || tenantId === 'unknown') {
      return { provider, updated: false };
    }

    const planCode = await this.resolvePlanCodeFromPayload(payload, existing?.planCode);
    const status = this.mapStripeSubscriptionStatus(String(payload.status ?? existing?.status ?? SubscriptionStatus.Active));

    await this.subscriptionModel.findOneAndUpdate(
      { provider, providerSubscriptionId },
      {
        $set: {
          planCode,
          provider,
          providerCustomerId: String(payload.customerId ?? payload.customer_id ?? existing?.providerCustomerId ?? tenantId),
          providerSubscriptionId,
          status,
          tenantId,
        },
      },
      { upsert: true, returnDocument: 'after' },
    );
    await this.reconcileTenantSubscriptionState(tenantId);

    return {
      provider,
      updated: true,
    };
  }

  verifyStripeWebhook(payload: Buffer, signature: string | undefined): Record<string, unknown> {
    const secret = this.configService.get<string>('billing.stripe.webhookSecret', '');
    if (!this.stripe || !signature || !secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new BadRequestException('Stripe webhook signature verification is not configured');
      }

      const parsed = this.parseWebhookPayload(payload);

      return {
        id: String(parsed.id ?? 'stripe-mock'),
        status: String(parsed.status ?? 'active'),
        ...parsed,
      };
    }

    const event = this.stripe.webhooks.constructEvent(payload, signature, secret);
    const object = event.data.object as unknown as Record<string, unknown>;
    const metadata = typeof object.metadata === 'object' && object.metadata ? object.metadata as Record<string, unknown> : {};
    const price = this.extractStripePrice(object);
    const stripeStatus = this.extractStripeEventStatus(event.type, object);

    return {
      customerId: typeof object.customer === 'string' ? object.customer : 'unknown',
      eventType: event.type,
      id: event.id,
      orderId: String(metadata.orderId ?? ''),
      paymentId: String(metadata.paymentId ?? ''),
      planCode: String(metadata.planCode ?? 'launch'),
      priceId: price?.id ?? '',
      productId: price?.productId ?? '',
      status: stripeStatus,
      subscriptionId: this.extractStripeSubscriptionId(event.type, object),
      tenantId: String(metadata.tenantId ?? object.client_reference_id ?? 'unknown'),
    };
  }

  async listConfiguredPlans(options: { includeHidden?: boolean } = {}): Promise<BillingPlan[]> {
    const plans = await Promise.all(
      (['launch', 'growth', 'enterprise'] as PlanCode[]).map((code) => this.resolveConfiguredPlan(code)),
    );
    return plans
      .filter((plan) => options.includeHidden || plan.visible)
      .sort((first, second) => first.sortOrder - second.sortOrder || first.monthlyPrice - second.monthlyPrice);
  }

  async updatePlanSettings(planCode: string, settings: Partial<BillingPlan>): Promise<BillingPlan> {
    const code = this.normalizePlanCode(planCode);
    const update = this.pickPlanSettings(settings);
    await this.planModel
      .findOneAndUpdate(
        { code },
        {
          $set: update,
          $setOnInsert: {
            active: true,
            code,
            monthlyPrice: 0,
            name: planLabels[code],
          },
        },
        { upsert: true },
      )
      .exec();

    return this.resolveConfiguredPlan(code);
  }

  async syncTenantSubscriptionFromStripe(tenantId: string): Promise<Subscription | null> {
    const subscriptions = await this.subscriptionModel
      .find({ provider: 'stripe', ...this.tenantSubscriptionFilter(tenantId) })
      .sort({ updatedAt: -1 })
      .lean<LeanSubscription[]>()
      .exec();

    if (!subscriptions.length) {
      await this.reconcileTenantSubscriptionState(tenantId);
      return null;
    }

    const syncedSubscriptions = await Promise.all(
      subscriptions.map((subscription) => this.syncSingleStripeSubscription(subscription)),
    );
    await this.reconcileTenantSubscriptionState(tenantId);
    return this.pickBestSubscription(syncedSubscriptions);
  }

  async getTenantBillingPlan(tenantId: string): Promise<BillingPlan | null> {
    const subscription = await this.syncTenantSubscriptionFromStripe(tenantId);
    if (!subscription) {
      return null;
    }

    const plans = await this.listConfiguredPlans({ includeHidden: true });
    return plans.find((plan) => plan.code === subscription.planCode) ?? null;
  }

  private extractStripeEventStatus(eventType: string, object: Record<string, unknown>): string {
    const objectStatus = typeof object.status === 'string' ? object.status : '';
    if (eventType.startsWith('customer.subscription.') && objectStatus) {
      return objectStatus;
    }

    const statusByEvent: Record<string, string> = {
      'checkout.session.async_payment_failed': 'past_due',
      'checkout.session.completed': 'active',
      'checkout.session.expired': 'canceled',
      'customer.subscription.created': 'active',
      'customer.subscription.deleted': 'canceled',
      'customer.subscription.paused': 'suspended',
      'customer.subscription.resumed': 'active',
      'invoice.payment_failed': 'past_due',
      'invoice.payment_succeeded': 'active',
    };

    return statusByEvent[eventType] ?? eventType;
  }

  private mapStripeSubscriptionStatus(status: string): SubscriptionStatus {
    const statusMap: Record<string, SubscriptionStatus> = {
      active: SubscriptionStatus.Active,
      canceled: SubscriptionStatus.Cancelled,
      cancelled: SubscriptionStatus.Cancelled,
      incomplete: SubscriptionStatus.PastDue,
      incomplete_expired: SubscriptionStatus.Cancelled,
      paused: SubscriptionStatus.Suspended,
      past_due: SubscriptionStatus.PastDue,
      trialing: SubscriptionStatus.Trialing,
      unpaid: SubscriptionStatus.Suspended,
    };

    return statusMap[status] ?? SubscriptionStatus.PastDue;
  }

  private async syncSingleStripeSubscription(subscription: LeanSubscription): Promise<LeanSubscription> {
    if (!this.stripe || !subscription.providerSubscriptionId.startsWith('sub_')) {
      return subscription;
    }

    try {
      const stripeSubscription = await this.stripe.subscriptions.retrieve(subscription.providerSubscriptionId, {
        expand: ['items.data.price.product'],
      });
      const status = this.mapStripeSubscriptionStatus(stripeSubscription.status);
      const price = this.extractStripePrice(stripeSubscription as unknown as Record<string, unknown>);
      const planCode = await this.resolvePlanCodeFromPayload(
        { priceId: price?.id ?? '', productId: price?.productId ?? '' },
        subscription.planCode,
      );
      const update: Record<string, unknown> = {
        planCode,
        providerCustomerId: typeof stripeSubscription.customer === 'string'
          ? stripeSubscription.customer
          : subscription.providerCustomerId,
        status,
      };
      const currentPeriodEnd = Number((stripeSubscription as unknown as Record<string, unknown>).current_period_end ?? 0);
      const trialEnd = Number((stripeSubscription as unknown as Record<string, unknown>).trial_end ?? 0);
      if (currentPeriodEnd) update.renewsAt = new Date(currentPeriodEnd * 1000);
      if (trialEnd) update.trialEndsAt = new Date(trialEnd * 1000);

      const nextSubscription = await this.subscriptionModel
        .findByIdAndUpdate(subscription._id, { $set: update }, { returnDocument: 'after' })
        .lean<LeanSubscription>()
        .exec();
      return nextSubscription ?? subscription;
    } catch {
      return subscription;
    }
  }

  private async reconcileTenantSubscriptionState(tenantId: string): Promise<void> {
    if (!tenantId || tenantId === 'unknown') {
      return;
    }
    const healthySubscriptionFilter: Record<string, unknown> = {
      provider: 'stripe',
      status: { $in: [...healthySubscriptionStatuses] },
      ...this.tenantSubscriptionFilter(tenantId),
    };
    const healthySubscription = await this.subscriptionModel.exists(healthySubscriptionFilter).exec();
    const nextTenantStatus = healthySubscription ? 'active' : 'suspended';
    await this.tenantModel
      .updateOne({ _id: tenantId, status: { $ne: 'archived' } }, { $set: { status: nextTenantStatus } })
      .exec();
  }

  private pickBestSubscription(subscriptions: LeanSubscription[]): Subscription | null {
    const [subscription] = [...subscriptions].sort((first, second) => {
      const firstHealthy = this.isHealthySubscriptionStatus(first.status);
      const secondHealthy = this.isHealthySubscriptionStatus(second.status);
      if (firstHealthy !== secondHealthy) {
        return firstHealthy ? -1 : 1;
      }

      return this.subscriptionTimeValue(second) - this.subscriptionTimeValue(first);
    });
    return subscription ?? null;
  }

  private isHealthySubscriptionStatus(status: string): boolean {
    return healthySubscriptionStatuses.has(status);
  }

  private subscriptionTimeValue(subscription: LeanSubscription): number {
    const value = subscription.updatedAt ?? subscription.createdAt;
    if (!value) {
      return 0;
    }
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  private tenantSubscriptionFilter(tenantId: string): Record<string, unknown> {
    return {
      $expr: {
        $eq: [{ $toString: '$tenantId' }, tenantId],
      },
    };
  }

  private async resolvePlanCodeFromPayload(payload: Record<string, unknown>, fallback = 'launch'): Promise<PlanCode> {
    const explicit = String(payload.planCode ?? payload.plan_code ?? '').toLowerCase();
    if (['enterprise', 'growth', 'launch'].includes(explicit)) {
      return explicit as PlanCode;
    }

    const priceId = String(payload.priceId ?? payload.price_id ?? '');
    const productId = String(payload.productId ?? payload.product_id ?? '');
    const plans = await this.listConfiguredPlans({ includeHidden: true });
    const matched = plans.find((plan) => plan.stripePriceId === priceId || plan.stripeProductId === productId);
    if (matched) {
      return matched.code;
    }

    return ['enterprise', 'growth', 'launch'].includes(fallback) ? fallback as PlanCode : 'launch';
  }

  private async resolveConfiguredPlan(planCode: string): Promise<BillingPlan> {
    const code = this.normalizePlanCode(planCode);
    const configuredId = this.getConfiguredPlanId(code).trim();
    const settings = await this.getPlanSettings(code);
    const fallbackPlan: BillingPlan = {
      active: Boolean(configuredId),
      ...settings,
      currency: 'INR',
      monthlyPrice: 0,
      name: planLabels[code],
      ...(configuredId.startsWith('price_') ? { stripePriceId: configuredId } : {}),
      ...(configuredId.startsWith('prod_') ? { stripeProductId: configuredId } : {}),
    };

    if (!this.stripe || !configuredId) {
      return fallbackPlan;
    }

    try {
      if (configuredId.startsWith('price_')) {
        const price = await this.stripe.prices.retrieve(configuredId, { expand: ['product'] });
        return this.applyPlanSettings(this.planFromStripePrice(code, price), settings);
      }

      const product = await this.stripe.products.retrieve(configuredId);
      const price = await this.findActiveRecurringPriceForProduct(configuredId);
      return {
        ...this.applyPlanSettings(this.planFromStripePrice(code, price), settings),
        active: product.active && price.active,
        name: product.name || planLabels[code],
        stripeProductId: product.id,
      };
    } catch {
      return fallbackPlan;
    }
  }

  private async findActiveRecurringPriceForProduct(productId: string): Promise<StripePrice> {
    if (!this.stripe) {
      throw new ServiceUnavailableException('Stripe is not configured');
    }
    const prices = await this.stripe.prices.list({
      active: true,
      limit: 100,
      product: productId,
      type: 'recurring',
    });
    const price = prices.data.find((item) => item.recurring?.interval === 'month') ?? prices.data[0];
    if (!price) {
      throw new ServiceUnavailableException('Stripe product has no active recurring price');
    }
    return price;
  }

  private planFromStripePrice(code: PlanCode, price: StripePrice): BillingPlan {
    const product = typeof price.product === 'string' ? null : price.product;
    const amount = Number(price.unit_amount ?? price.unit_amount_decimal ?? 0) / 100;
    return {
      active: price.active,
      ...defaultPlanSettings[code],
      code,
      currency: price.currency.toUpperCase(),
      interval: price.recurring?.interval,
      monthlyPrice: amount,
      name: product && 'name' in product ? product.name : planLabels[code],
      stripePriceId: price.id,
      stripeProductId: typeof price.product === 'string' ? price.product : price.product.id,
    };
  }

  private extractStripePrice(object: Record<string, unknown>): { id: string; productId: string } | null {
    const items = object.items as { data?: { price?: { id?: string; product?: string | { id?: string } } }[] } | undefined;
    const price = items?.data?.[0]?.price;
    if (!price?.id) {
      return null;
    }

    return {
      id: price.id,
      productId: typeof price.product === 'string' ? price.product : price.product?.id ?? '',
    };
  }

  private extractStripeSubscriptionId(eventType: string, object: Record<string, unknown>): string {
    if (eventType.startsWith('customer.subscription.')) {
      return String(object.id ?? '');
    }

    if (eventType.startsWith('checkout.session.') || eventType.startsWith('invoice.')) {
      return typeof object.subscription === 'string' ? object.subscription : '';
    }

    if (typeof object.subscription === 'string') {
      return object.subscription;
    }
    return '';
  }

  private normalizePlanCode(planCode: string): PlanCode {
    return ['enterprise', 'growth', 'launch'].includes(planCode) ? planCode as PlanCode : 'launch';
  }

  private async getPlanSettings(code: PlanCode): Promise<Omit<
    BillingPlan,
    'active' | 'currency' | 'interval' | 'monthlyPrice' | 'name' | 'stripePriceId' | 'stripeProductId'
  >> {
    const saved = await this.planModel.findOne({ code }).lean<Record<string, unknown>>().exec();
    const defaults = defaultPlanSettings[code];
    return {
      badge: String(saved?.badge ?? defaults.badge),
      branchLimit: Number(saved?.branchLimit ?? defaults.branchLimit),
      code,
      description: String(saved?.description ?? defaults.description),
      employeeLimit: Number(saved?.employeeLimit ?? defaults.employeeLimit),
      monthlyBillLimit: Number(saved?.monthlyBillLimit ?? defaults.monthlyBillLimit),
      perks: Array.isArray(saved?.perks) && saved.perks.length
        ? saved.perks.map((perk) => String(perk)).filter(Boolean)
        : defaults.perks,
      sortOrder: Number(saved?.sortOrder ?? defaults.sortOrder),
      tableLimit: Number(saved?.tableLimit ?? defaults.tableLimit),
      visible: typeof saved?.visible === 'boolean' ? saved.visible : defaults.visible,
    };
  }

  private applyPlanSettings(
    plan: BillingPlan,
    settings: Omit<BillingPlan, 'active' | 'currency' | 'interval' | 'monthlyPrice' | 'name' | 'stripePriceId' | 'stripeProductId'>,
  ): BillingPlan {
    return {
      ...plan,
      ...settings,
      code: plan.code,
    };
  }

  private pickPlanSettings(settings: Partial<BillingPlan>): Record<string, unknown> {
    const update: Record<string, unknown> = {};
    for (const key of [
      'badge',
      'branchLimit',
      'description',
      'employeeLimit',
      'monthlyBillLimit',
      'perks',
      'sortOrder',
      'tableLimit',
      'visible',
    ] as const) {
      if (settings[key] !== undefined) {
        update[key] = settings[key];
      }
    }
    return update;
  }

  private getConfiguredPlanId(planCode: PlanCode): string {
    const prices = {
      enterprise: this.configService.get<string>('billing.stripe.priceEnterprise', ''),
      growth: this.configService.get<string>('billing.stripe.priceGrowth', ''),
      launch: this.configService.get<string>('billing.stripe.priceLaunch', ''),
    } as const;

    return prices[planCode as keyof typeof prices] ?? '';
  }

  private getWebUrl(): string {
    return process.env.WEB_URL ?? 'http://localhost:3000';
  }

  private parseWebhookPayload(payload: Buffer): Record<string, unknown> {
    try {
      return JSON.parse(payload.toString('utf8')) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
}
