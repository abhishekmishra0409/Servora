import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { OrderStatus, SOCKET_EVENTS } from '@restaurent/shared';
import { Model } from 'mongoose';

import { Order } from '../../database/schemas/order.schema';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { RealtimePublisher } from '../../infrastructure/realtime/realtime-publisher.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    private readonly auditService: AuditService,
    private readonly realtimePublisher: RealtimePublisher,
  ) {}

  async getLive(branchId: string): Promise<Order[]> {
    return this.orderModel
      .find({
        branchId,
        status: {
          $in: [
            OrderStatus.Accepted,
            OrderStatus.PendingConfirmation,
            OrderStatus.Preparing,
            OrderStatus.Ready,
          ],
        },
      })
      .sort({ submittedAt: -1 })
      .lean()
      .exec();
  }

  async getBillable(branchId: string): Promise<Order[]> {
    return this.orderModel
      .find({
        branchId,
        status: { $in: [OrderStatus.Ready, OrderStatus.Served] },
      })
      .sort({ submittedAt: -1 })
      .lean()
      .exec();
  }

  async getById(id: string): Promise<Order> {
    const order = await this.orderModel.findById(id).lean().exec();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async confirm(id: string, userId: string): Promise<Order> {
    const order = await this.orderModel
      .findByIdAndUpdate(
        id,
        {
          confirmedByUserId: userId,
          status: OrderStatus.Accepted,
        },
        { returnDocument: 'after' },
      )
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    await this.afterStatusChange(order, userId, 'order.confirmed');
    return order;
  }

  async reject(id: string, userId?: string): Promise<Order> {
    const order = await this.orderModel
      .findByIdAndUpdate(id, { status: OrderStatus.Rejected }, { returnDocument: 'after' })
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    await this.afterStatusChange(order, userId, 'order.rejected');
    return order;
  }

  async updateStatus(id: string, status: OrderStatus, userId?: string): Promise<Order> {
    const order = await this.orderModel
      .findByIdAndUpdate(id, { status }, { returnDocument: 'after' })
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    await this.afterStatusChange(order, userId, 'order.status_updated');
    return order;
  }

  private async afterStatusChange(order: Order & { _id?: unknown }, actorUserId: string | undefined, action: string): Promise<void> {
    const orderId = String(order._id ?? '');
    await Promise.all([
      this.realtimePublisher.publishRealtimeEvent(`branch:${order.branchId}`, SOCKET_EVENTS.orderStatusUpdated, {
        orderId,
        status: order.status,
      }),
      this.realtimePublisher.publishRealtimeEvent(`order:${orderId}`, SOCKET_EVENTS.orderStatusUpdated, {
        orderId,
        status: order.status,
      }),
      this.realtimePublisher.publishRealtimeEvent(`tableSession:${order.tableSessionId}`, SOCKET_EVENTS.orderStatusUpdated, {
        orderId,
        status: order.status,
      }),
      this.auditService.record({
        action,
        actorUserId,
        branchId: order.branchId,
        entityId: orderId,
        entityType: 'order',
        payload: { status: order.status },
        tenantId: order.tenantId,
      }),
    ]);
  }
}
