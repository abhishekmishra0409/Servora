import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { OrderStatus, PaymentStatus, TableStatus } from '@restaurent/shared';
import { Model, Types } from 'mongoose';
import Stripe from 'stripe';

import { Order } from '../../database/schemas/order.schema';
import { Payment } from '../../database/schemas/payment.schema';
import { RestaurantTable } from '../../database/schemas/table.schema';
import { TableSession } from '../../database/schemas/table-session.schema';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { RealtimePublisher } from '../../infrastructure/realtime/realtime-publisher.service';
import { BillingService } from '../billing/billing.service';
import { CreatePaymentCheckoutDto } from './dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(Payment.name) private readonly paymentModel: Model<Payment>,
    @InjectModel(TableSession.name) private readonly tableSessionModel: Model<TableSession>,
    @InjectModel(RestaurantTable.name) private readonly tableModel: Model<RestaurantTable>,
    private readonly auditService: AuditService,
    private readonly billingService: BillingService,
    private readonly configService: ConfigService,
    private readonly realtimePublisher: RealtimePublisher,
  ) { }

  async requestBill(orderId: string, actorUserId?: string): Promise<Payment> {
    const order = await this.findOrder(orderId);
    const payment = await this.requestBillForTableSession(order.tableSessionId, actorUserId);
    if (!payment) {
      throw new BadRequestException('No payable orders found for this table session.');
    }

    return payment;
  }

  async requestBillForTableSession(tableSessionId: string, actorUserId?: string): Promise<Payment | null> {
    const orders = await this.findPayableOrdersForTableSession(tableSessionId);
    if (!orders.length) {
      return null;
    }

    const firstOrder = orders[0]!;
    const orderIds = orders.map((order) => this.documentId(order));
    const primaryOrderId = orderIds[0]!;
    const amount = orders.reduce((total, order) => total + order.grandTotal, 0);
    let payment = await this.paymentModel
      .findOne({
        tableSessionId,
        status: { $in: [PaymentStatus.Pending, PaymentStatus.Authorized] },
      })
      .exec();

    if (!payment) {
      await this.assertMonthlyBillLimit(firstOrder.tenantId);
      payment = await this.paymentModel.create({
        amount,
        branchId: firstOrder.branchId,
        currency: 'INR',
        method: 'pay_later',
        orderId: primaryOrderId,
        orderIds,
        provider: 'manual',
        status: PaymentStatus.Pending,
        tableId: firstOrder.tableId,
        tableSessionId,
        tenantId: firstOrder.tenantId,
      });
    } else {
      payment.amount = amount;
      payment.orderId = primaryOrderId;
      payment.orderIds = orderIds;
      payment.tableId = firstOrder.tableId;
      payment.method = payment.method || 'pay_later';
      await payment.save();
    }

    await this.auditService.record({
      action: 'payment.bill_requested',
      actorUserId,
      branchId: firstOrder.branchId,
      entityId: String(payment._id),
      entityType: 'payment',
      payload: { orderIds, tableSessionId },
      tenantId: firstOrder.tenantId,
    });
    await this.publishPaymentRequested(payment, orderIds);

    return payment;
  }

  async listBills(branchId: string): Promise<unknown[]> {
    const activeOrders = await this.orderModel
      .find({
        branchId,
        status: { $nin: [OrderStatus.Closed, OrderStatus.Rejected] },
      })
      .sort({ submittedAt: 1 })
      .lean()
      .exec();
    const payments = await this.paymentModel
      .find({
        branchId,
        status: { $in: [PaymentStatus.Pending, PaymentStatus.Authorized, PaymentStatus.Captured] },
        tableSessionId: { $exists: true, $ne: null },
      })
      .sort({ updatedAt: -1 })
      .lean()
      .exec();
    const toValidSessionId = (value: unknown): string | null => {
      if (!value) {
        return null;
      }
      const sessionId = String(value);
      return Types.ObjectId.isValid(sessionId) ? sessionId : null;
    };

    const activeSessionIds = activeOrders
      .map((order) => toValidSessionId(order.tableSessionId))
      .filter((sessionId): sessionId is string => Boolean(sessionId));
    const paymentSessionIds = payments
      .map((payment) => toValidSessionId(payment.tableSessionId))
      .filter((sessionId): sessionId is string => Boolean(sessionId));
    const sessionIds = [...new Set([...activeSessionIds, ...paymentSessionIds])];
    const sessionOrders = sessionIds.length
      ? await this.orderModel
        .find({
          branchId,
          status: { $ne: OrderStatus.Rejected },
          tableSessionId: { $in: sessionIds },
        })
        .sort({ submittedAt: 1 })
        .lean()
        .exec()
      : [];
    const ordersBySession = new Map<string, Order[]>();

    for (const order of sessionOrders) {
      const tableSessionId = toValidSessionId(order.tableSessionId);
      if (!tableSessionId) {
        continue;
      }
      ordersBySession.set(tableSessionId, [...(ordersBySession.get(tableSessionId) ?? []), order as Order]);
    }

    const paymentBySession = new Map<string, (typeof payments)[number]>();
    for (const payment of payments) {
      const tableSessionId = toValidSessionId(payment.tableSessionId);
      if (!tableSessionId) {
        continue;
      }
      if (!paymentBySession.has(tableSessionId)) {
        paymentBySession.set(tableSessionId, payment);
      }
    }

    return sessionIds.map((tableSessionId) => {
      const sessionOrders = ordersBySession.get(tableSessionId) ?? [];
      const payment = paymentBySession.get(tableSessionId);
      const sessionAmount = sessionOrders.reduce((total, order) => total + order.grandTotal, 0);
      const amount = payment?.status === PaymentStatus.Captured ? payment.amount : sessionAmount;
      const firstOrder = sessionOrders[0] as (Order & { _id?: unknown }) | undefined;
      const orderIds = sessionOrders.map((order) => this.documentId(order));
      const paymentId = payment ? this.documentId(payment) : undefined;

      return {
        _id: paymentId,
        amount,
        branchId,
        currency: payment?.currency ?? 'INR',
        id: paymentId,
        method: payment?.method ?? 'pay_later',
        orderIds,
        orders: sessionOrders,
        paymentId,
        provider: payment?.provider ?? 'manual',
        status: payment?.status ?? 'not_requested',
        tableId: payment?.tableId ?? firstOrder?.tableId ?? '',
        tableSessionId,
        tenantId: payment?.tenantId ?? firstOrder?.tenantId ?? '',
      };
    });
  }

  async createCheckoutSession(dto: CreatePaymentCheckoutDto): Promise<{ paymentId: string; provider: string; url: string }> {
    const order = await this.findOrder(dto.orderId);
    const provider = dto.provider ?? 'stripe';
    const existingPayment = await this.paymentModel.findOne({ orderId: dto.orderId, provider }).exec();
    if (!existingPayment) {
      await this.assertMonthlyBillLimit(order.tenantId);
    }
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
    return this.markPaid(id, 'cash', actorUserId);
  }

  async markPaid(id: string, method: string, actorUserId: string): Promise<Payment> {
    const existingPayment = await this.paymentModel.findById(id).exec();
    if (!existingPayment) {
      throw new NotFoundException('Payment not found');
    }

    const payableOrders = existingPayment.tableSessionId
      ? await this.findPayableOrdersForTableSession(existingPayment.tableSessionId)
      : [];
    const payableOrderIds = payableOrders.map((order) => this.documentId(order));
    const orderIds = payableOrderIds.length ? payableOrderIds : this.paymentOrderIds(existingPayment);
    const amount = payableOrders.length
      ? payableOrders.reduce((total, order) => total + order.grandTotal, 0)
      : existingPayment.amount;
    const primaryOrderId = orderIds[0] ?? existingPayment.orderId;
    const tableId = payableOrders[0]?.tableId ?? existingPayment.tableId;
    const payment = await this.paymentModel
      .findByIdAndUpdate(
        id,
        {
          amount,
          method,
          orderId: primaryOrderId,
          orderIds,
          provider: 'manual',
          status: PaymentStatus.Captured,
          tableId,
        },
        { returnDocument: 'after' },
      )
      .exec();

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const orders = await this.orderModel
      .find({
        _id: { $in: orderIds },
      })
      .exec();

    if (orders.length) {
      await this.orderModel.updateMany({ _id: { $in: orderIds } }, { status: OrderStatus.Closed }).exec();
      await this.closeTableSessionIfSettled(payment.tableSessionId ?? orders[0]!.tableSessionId);
      await this.auditService.record({
        action: 'payment.captured',
        actorUserId,
        branchId: payment.branchId,
        entityId: String(payment._id),
        entityType: 'payment',
        payload: { method, orderIds },
        tenantId: payment.tenantId,
      });
      await Promise.all([
        ...orders.map((order) =>
          this.realtimePublisher.publishRealtimeEvent(`branch:${payment.branchId}`, 'order.status_updated', {
            orderId: String((order as { _id: unknown })._id),
            status: OrderStatus.Closed,
          }),
        ),
        ...orders.map((order) =>
          this.realtimePublisher.publishRealtimeEvent(`tableSession:${order.tableSessionId}`, 'order.status_updated', {
            orderId: String((order as { _id: unknown })._id),
            status: OrderStatus.Closed,
          }),
        ),
        this.realtimePublisher.publishRealtimeEvent(`branch:${payment.branchId}`, 'payment.status_updated', {
          orderIds,
          paymentId: String(payment._id),
          status: payment.status,
          tableSessionId: payment.tableSessionId,
        }),
        this.realtimePublisher.publishRealtimeEvent(`tableSession:${payment.tableSessionId ?? orders[0]!.tableSessionId}`, 'payment.status_updated', {
          orderIds,
          paymentId: String(payment._id),
          status: payment.status,
        }),
      ]);
    }

    return payment;
  }

  private findPayableOrdersForTableSession(tableSessionId: string): Promise<Order[]> {
    return this.orderModel
      .find({
        tableSessionId,
        status: { $nin: [OrderStatus.Closed, OrderStatus.Rejected] },
      })
      .sort({ submittedAt: 1 })
      .exec();
  }

  private paymentOrderIds(payment: Payment): string[] {
    const orderIds = (payment.orderIds ?? []).map(String).filter(Boolean);
    return orderIds.length ? orderIds : payment.orderId ? [String(payment.orderId)] : [];
  }

  private documentId(document: unknown): string {
    return String((document as { _id: unknown })._id);
  }

  private async publishPaymentRequested(payment: Payment, orderIds: string[]): Promise<void> {
    await Promise.all([
      this.realtimePublisher.publishRealtimeEvent(`branch:${payment.branchId}`, 'payment.bill_requested', {
        orderIds,
        paymentId: this.documentId(payment),
        tableSessionId: payment.tableSessionId,
      }),
      this.realtimePublisher.publishRealtimeEvent(`tableSession:${payment.tableSessionId}`, 'payment.bill_requested', {
        orderIds,
        paymentId: this.documentId(payment),
      }),
    ]);
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
      const tableSession = await this.tableSessionModel
        .findByIdAndUpdate(tableSessionId, { closedAt: new Date(), status: 'closed' }, { returnDocument: 'after' })
        .exec();

      if (tableSession) {
        await Promise.all([
          this.tableModel.findByIdAndUpdate(tableSession.tableId, { status: TableStatus.Free }).exec(),
          this.realtimePublisher.publishRealtimeEvent(`branch:${tableSession.branchId}`, 'table.status_changed', {
            status: TableStatus.Free,
            tableId: tableSession.tableId,
          }),
        ]);
      }
    }
  }

  private async assertMonthlyBillLimit(tenantId: string): Promise<void> {
    const plan = await this.billingService.getTenantBillingPlan(tenantId);
    const monthlyBillLimit = Number(plan?.monthlyBillLimit ?? 0);
    if (!monthlyBillLimit) {
      return;
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const billCount = await this.paymentModel
      .countDocuments({ tenantId, createdAt: { $gte: startOfMonth } })
      .exec();
    if (billCount >= monthlyBillLimit) {
      throw new BadRequestException(`Your subscription allows up to ${monthlyBillLimit} generated bills per month.`);
    }
  }
}
