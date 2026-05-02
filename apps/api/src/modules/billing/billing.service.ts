import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import Stripe from 'stripe';
import { Model } from 'mongoose';

import { Subscription } from '../../database/schemas/subscription.schema';
import { SubscriptionPlan } from '../../database/schemas/subscription-plan.schema';
import { CheckoutSessionDto, CustomerPortalDto } from './dto';

type StripeClient = InstanceType<typeof Stripe>;

@Injectable()
export class BillingService {
  private readonly stripe: StripeClient | undefined;
  private readonly stripeSecretKey: string;

  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<Subscription>,
    @InjectModel(SubscriptionPlan.name)
    private readonly planModel: Model<SubscriptionPlan>,
    private readonly configService: ConfigService,
  ) {
    this.stripeSecretKey = this.configService.get<string>('billing.stripe.secretKey', '').trim();
    this.stripe = this.stripeSecretKey ? new Stripe(this.stripeSecretKey) : undefined;
  }

  getProviderName(): 'stripe' {
    return 'stripe';
  }

  async summary(tenantId: string): Promise<unknown> {
    const subscription = await this.subscriptionModel
      .findOne({ tenantId })
      .sort({ updatedAt: -1 })
      .lean()
      .exec();
    const plan = subscription
      ? await this.planModel.findOne({ code: subscription.planCode }).lean().exec()
      : null;

    return {
      plan,
      subscription,
    };
  }

  async createCheckoutSession(dto: CheckoutSessionDto): Promise<{ provider: string; url: string }> {
    const provider = this.getProviderName();
    const priceId = this.getPriceId(dto.planCode);

    if (this.stripe && priceId) {
      const session = await this.stripe.checkout.sessions.create({
        cancel_url: `${this.getWebUrl()}/subscription?checkout=cancelled`,
        client_reference_id: dto.tenantId,
        line_items: [{ price: priceId, quantity: 1 }],
        metadata: {
          planCode: dto.planCode,
          tenantId: dto.tenantId,
        },
        mode: 'subscription',
        success_url: `${this.getWebUrl()}/subscription?checkout=success`,
      });

      if (session.url) {
        return {
          provider,
          url: session.url,
        };
      }
    }

    return {
      provider,
      url: `https://dashboard.stripe.com/test/payments?plan=${dto.planCode}&tenant=${dto.tenantId}`,
    };
  }

  async createCustomerPortal(dto: CustomerPortalDto): Promise<{ provider: string; url: string }> {
    const provider = this.getProviderName();

    if (this.stripe) {
      const subscription = await this.subscriptionModel
        .findOne({ provider, tenantId: dto.tenantId })
        .sort({ updatedAt: -1 })
        .lean()
        .exec();

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
    const providerSubscriptionId =
      String(payload.subscriptionId ?? payload.subscription_id ?? payload.id ?? 'unknown');
    const tenantId = String(payload.tenantId ?? payload.tenant_id ?? 'unknown');

    await this.subscriptionModel.findOneAndUpdate(
      { provider, providerSubscriptionId },
      {
        $set: {
          planCode: String(payload.planCode ?? payload.plan_code ?? 'launch'),
          provider,
          providerCustomerId: String(payload.customerId ?? payload.customer_id ?? tenantId),
          providerSubscriptionId,
          status: String(payload.status ?? 'active'),
          tenantId,
        },
      },
      { upsert: true, returnDocument: 'after' },
    );

    return {
      provider,
      updated: true,
    };
  }

  verifyStripeWebhook(payload: Buffer, signature: string | undefined): Record<string, unknown> {
    const secret = this.configService.get<string>('billing.stripe.webhookSecret', '');
    if (!this.stripe || !signature || !secret) {
      const parsed = this.parseWebhookPayload(payload);

      return {
        id: String(parsed.id ?? 'stripe-mock'),
        status: String(parsed.status ?? 'active'),
        ...parsed,
      };
    }

    const event = this.stripe.webhooks.constructEvent(payload, signature, secret);
    return {
      customerId: event.data.object && 'customer' in event.data.object ? event.data.object.customer : 'unknown',
      id: event.id,
      status: event.type,
      subscriptionId:
        event.data.object && 'id' in event.data.object ? event.data.object.id : 'unknown',
    };
  }

  private getPriceId(planCode: string): string {
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
