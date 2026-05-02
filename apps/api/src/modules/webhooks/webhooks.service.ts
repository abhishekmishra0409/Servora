import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { IdempotencyKey } from '../../database/schemas/idempotency-key.schema';
import { BillingService } from '../billing/billing.service';

@Injectable()
export class WebhooksService {
  constructor(
    @InjectModel(IdempotencyKey.name)
    private readonly idempotencyModel: Model<IdempotencyKey>,
    private readonly billingService: BillingService,
  ) {}

  async handleStripe(payload: Buffer, signature?: string): Promise<{ accepted: boolean; duplicate: boolean }> {
    const event = this.billingService.verifyStripeWebhook(payload, signature);
    return this.persistWebhook('stripe', String(event.id ?? 'stripe-mock'), event);
  }

  private async persistWebhook(
    provider: 'stripe',
    eventId: string,
    payload: Record<string, unknown>,
  ): Promise<{ accepted: boolean; duplicate: boolean }> {
    const route = `webhook:${provider}`;
    const existing = await this.idempotencyModel
      .findOne({ key: eventId, route, tenantId: `provider:${provider}` })
      .lean()
      .exec();

    if (existing) {
      return { accepted: true, duplicate: true };
    }

    await this.idempotencyModel.create({
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      key: eventId,
      responseBody: payload,
      route,
      statusCode: 200,
      tenantId: `provider:${provider}`,
    });

    await this.billingService.upsertSubscriptionFromWebhook(provider, payload);

    return { accepted: true, duplicate: false };
  }
}
