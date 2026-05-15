import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { OrderStatus, PaymentStatus } from '@restaurent/shared';
import { Model } from 'mongoose';

import { IdempotencyKey } from '../../database/schemas/idempotency-key.schema';
import { Order } from '../../database/schemas/order.schema';
import { Payment } from '../../database/schemas/payment.schema';
import { TableSession } from '../../database/schemas/table-session.schema';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { RealtimePublisher } from '../../infrastructure/realtime/realtime-publisher.service';
import { BillingService } from '../billing/billing.service';

@Injectable()
export class WebhooksService {
  constructor(
    @InjectModel(IdempotencyKey.name)
    private readonly idempotencyModel: Model<IdempotencyKey>,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<Payment>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<Order>,
    @InjectModel(TableSession.name)
    private readonly tableSessionModel: Model<TableSession>,
    private readonly billingService: BillingService,
    private readonly auditService: AuditService,
    private readonly realtimePublisher: RealtimePublisher,
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
    await this.applyPaymentWebhook(payload);
    await this.auditService.record({
      action: 'billing.webhook_accepted',
      entityId: eventId,
      entityType: 'webhook',
      payload,
      tenantId: `provider:${provider}`,
    });

    return { accepted: true, duplicate: false };
  }

  private async applyPaymentWebhook(payload: Record<string, unknown>): Promise<void> {
    const paymentId = String(payload.paymentId ?? '');
    const orderId = String(payload.orderId ?? '');
    if (!paymentId || !orderId) {
      return;
    }

    const rawStatus = String(payload.status ?? '').toLowerCase();
    const failedStatuses = ['canceled', 'cancelled', 'failed', 'incomplete_expired', 'past_due', 'suspended', 'unpaid'];
    const status = failedStatuses.some((item) => rawStatus.includes(item)) ? PaymentStatus.Failed : PaymentStatus.Captured;
    const payment = await this.paymentModel
      .findByIdAndUpdate(paymentId, { status }, { returnDocument: 'after' })
      .exec();
    if (!payment || status !== PaymentStatus.Captured) {
      return;
    }

    const order = await this.orderModel
      .findByIdAndUpdate(orderId, { status: OrderStatus.Closed }, { returnDocument: 'after' })
      .exec();
    if (!order) {
      return;
    }

    const openOrders = await this.orderModel
      .exists({ tableSessionId: order.tableSessionId, status: { $nin: [OrderStatus.Closed, OrderStatus.Rejected] } })
      .exec();
    if (!openOrders) {
      await this.tableSessionModel.findByIdAndUpdate(order.tableSessionId, { closedAt: new Date(), status: 'closed' }).exec();
    }

    await this.realtimePublisher.publishRealtimeEvent(`tableSession:${order.tableSessionId}`, 'payment.status_updated', {
      orderId,
      paymentId,
      status,
    });
  }
}
