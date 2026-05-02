import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { OrderStatus } from '@restaurent/shared';
import { Model } from 'mongoose';

import { Order } from '../../database/schemas/order.schema';

@Injectable()
export class OrdersService {
  constructor(@InjectModel(Order.name) private readonly orderModel: Model<Order>) {}

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

    return order;
  }

  async reject(id: string): Promise<Order> {
    const order = await this.orderModel
      .findByIdAndUpdate(id, { status: OrderStatus.Rejected }, { returnDocument: 'after' })
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const order = await this.orderModel
      .findByIdAndUpdate(id, { status }, { returnDocument: 'after' })
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }
}
