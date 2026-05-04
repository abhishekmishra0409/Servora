import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { OrderStatus, PaymentStatus } from '@restaurent/shared';
import { Model } from 'mongoose';
import Stripe from 'stripe';

import { Order } from '../../database/schemas/order.schema';
import { Payment } from '../../database/schemas/payment.schema';
import { TableSession } from '../../database/schemas/table-session.schema';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { RealtimePublisher } from '../../infrastructure/realtime/realtime-publisher.service';
import { CreatePaymentCheckoutDto } from './dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(Payment.name) private readonly paymentModel: Model<Payment>,
    @InjectModel(TableSession.name) private readonly tableSessionModel: Model<TableSession>,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
    private readonly queueService: QueueService,
    private readonly realtimePublisher: RealtimePublisher,
  ) {}

  async requestBill(orderId: string, actorUserId: string): Promise<Payment> {
    const order = await this.findOrder(orderId);
    const payment = await this.paymentModel.findOneAndUpdate(
      { orderId },
      {
        $setOnInsert: {
          amount: order.grandTotal,
          branchId: order.branchId,
          currency: 'INR',
          method: 'pay_later',
          orderId,
          provider: 'manual',
          status: PaymentStatus.Pending,
          tenantId: order.tenantId,
        },
      },
      { returnDocument: 'after', upsert: true },
    );

    await this.auditService.record({
      action: 'payment.bill_requested',
      actorUserId,
      branchId: order.branchId,
      entityId: String(payment._id),
      entityType: 'payment',
      payload: { orderId },
      tenantId: order.tenantId,
    });
    await this.queueService.enqueueNotificationJob(
      'notifications.bill_requested',
      { branchId: order.branchId, orderId, paymentId: String(payment._id), tenantId: order.tenantId },
      { jobId: `bill-requested:${orderId}` },
    );
    await this.realtimePublisher.publishRealtimeEvent(`tableSession:${order.tableSessionId}`, 'payment.bill_requested', {
      orderId,
      paymentId: String(payment._id),
    });

    return payment;
  }

  async createCheckoutSession(dto: CreatePaymentCheckoutDto): Promise<{ paymentId: string; provider: string; url: string }> {
    const order = await this.findOrder(dto.orderId);
    const provider = dto.provider ?? 'stripe';
    const payment = await this.paymentModel.findOneAndUpdate(
      { orderId: dto.orderId, provider },
      {
        $set: {
          amount: order.grandTotal,
          branchId: order.branchId,
          currency: 'INR',
          method: provider,
          orderId: dto.orderId,
          provider,
          status: PaymentStatus.Pending,
          tenantId: order.tenantId,
        },
      },
      { returnDocument: 'after', upsert: true },
    );

    const stripeSecretKey = this.configService.get<string>('billing.stripe.secretKey', '').trim();
    if (provider === 'stripe' && stripeSecretKey) {
      const stripe = new Stripe(stripeSecretKey);
      const session = await stripe.checkout.sessions.create({
        cancel_url: `${process.env.WEB_URL ?? 'http://localhost:3000'}/payments/${String(payment._id)}?checkout=cancelled`,
        line_items: [
          {
            price_data: {
              currency: 'inr',
              product_data: { name: `Order ${order.orderNo}` },
              unit_amount: Math.max(50, Math.round(order.grandTotal * 100)),
            },
            quantity: 1,
          },
        ],
        metadata: {
          orderId: dto.orderId,
          paymentId: String(payment._id),
          tenantId: order.tenantId,
        },
        mode: 'payment',
        success_url: `${process.env.WEB_URL ?? 'http://localhost:3000'}/payments/${String(payment._id)}?checkout=success`,
      });

      return {
        paymentId: String(payment._id),
        provider,
        url: session.url ?? '',
      };
    }

    return {
      paymentId: String(payment._id),
      provider,
      url: provider === 'stripe' ? `${process.env.WEB_URL ?? 'http://localhost:3000'}/payments/${String(payment._id)}` : '',
    };
  }

  async getById(id: string): Promise<Payment> {
    const payment = await this.paymentModel.findById(id).lean().exec();
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  async markCashPaid(id: string, actorUserId: string): Promise<Payment> {
    const payment = await this.paymentModel
      .findByIdAndUpdate(id, { status: PaymentStatus.Captured }, { returnDocument: 'after' })
      .exec();

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const order = await this.orderModel
      .findByIdAndUpdate(payment.orderId, { status: OrderStatus.Closed }, { returnDocument: 'after' })
      .exec();

    if (order) {
      await this.closeTableSessionIfSettled(order.tableSessionId);
      await this.auditService.record({
        action: 'payment.cash_captured',
        actorUserId,
        branchId: payment.branchId,
        entityId: String(payment._id),
        entityType: 'payment',
        payload: { orderId: payment.orderId },
        tenantId: payment.tenantId,
      });
      await this.realtimePublisher.publishRealtimeEvent(`branch:${payment.branchId}`, 'order.status_updated', {
        orderId: String(order._id),
        status: OrderStatus.Closed,
      });
      await this.queueService.enqueueNotificationJob(
        'notifications.payment_captured',
        {
          branchId: payment.branchId,
          orderId: payment.orderId,
          paymentId: String(payment._id),
          tenantId: payment.tenantId,
        },
        { jobId: `payment-captured:${String(payment._id)}` },
      );
      await this.realtimePublisher.publishRealtimeEvent(`tableSession:${order.tableSessionId}`, 'payment.status_updated', {
        orderId: String(order._id),
        paymentId: String(payment._id),
        status: payment.status,
      });
    }

    return payment;
  }

  private async findOrder(orderId: string): Promise<Order> {
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if ([OrderStatus.Rejected, OrderStatus.Closed].includes(order.status)) {
      throw new BadRequestException('Order is not payable');
    }
    return order;
  }

  private async closeTableSessionIfSettled(tableSessionId: string): Promise<void> {
    const openOrders = await this.orderModel
      .exists({ tableSessionId, status: { $nin: [OrderStatus.Closed, OrderStatus.Rejected] } })
      .exec();

    if (!openOrders) {
      await this.tableSessionModel.findByIdAndUpdate(tableSessionId, { closedAt: new Date(), status: 'closed' }).exec();
    }
  }
}
