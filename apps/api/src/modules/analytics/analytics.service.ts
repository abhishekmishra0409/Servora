import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { MenuItem } from '../../database/schemas/menu-item.schema';
import { Order } from '../../database/schemas/order.schema';
import { ServiceRequest } from '../../database/schemas/service-request.schema';
import { TableSession } from '../../database/schemas/table-session.schema';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(ServiceRequest.name) private readonly serviceRequestModel: Model<ServiceRequest>,
    @InjectModel(TableSession.name) private readonly tableSessionModel: Model<TableSession>,
    @InjectModel(MenuItem.name) private readonly menuItemModel: Model<MenuItem>,
  ) {}

  async overview(branchId: string): Promise<unknown> {
    const [orders, sessions, serviceRequests] = await Promise.all([
      this.orderModel.find({ branchId }).lean().exec(),
      this.tableSessionModel.find({ branchId, status: 'active' }).lean().exec(),
      this.serviceRequestModel.find({ branchId, status: { $ne: 'resolved' } }).lean().exec(),
    ]);

    const todayRevenue = orders.reduce((total, order) => total + order.grandTotal, 0);
    const avgBasket = orders.length > 0 ? todayRevenue / orders.length : 0;

    return {
      activeSessions: sessions.length,
      avgBasket: Number(avgBasket.toFixed(2)),
      liveOrders: orders.length,
      serviceRequestsOpen: serviceRequests.length,
      todayRevenue: Number(todayRevenue.toFixed(2)),
    };
  }

  async menu(branchId: string): Promise<unknown> {
    const items = await this.menuItemModel.find({ branchId }).lean().exec();

    return {
      itemCount: items.length,
      items: items.map((item) => ({
        available: item.available,
        name: item.name,
        price: item.price,
      })),
    };
  }
}

