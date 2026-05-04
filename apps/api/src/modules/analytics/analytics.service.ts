import { Injectable } from '@nestjs/common';
import { ServiceRequestStatus } from '@restaurent/shared';
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
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const [orders, sessions, serviceRequests] = await Promise.all([
      this.orderModel.find({ branchId, submittedAt: { $gte: start, $lt: end } }).lean().exec(),
      this.tableSessionModel.find({ branchId, status: 'active' }).lean().exec(),
      this.serviceRequestModel.find({ branchId, status: { $ne: ServiceRequestStatus.Resolved } }).lean().exec(),
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
    const [items, orders] = await Promise.all([
      this.menuItemModel.find({ branchId }).lean().exec(),
      this.orderModel.find({ branchId }).lean().exec(),
    ]);
    const salesByItem = new Map<string, { quantity: number; revenue: number }>();

    for (const order of orders) {
      for (const item of order.items) {
        const current = salesByItem.get(item.menuItemId) ?? { quantity: 0, revenue: 0 };
        current.quantity += item.quantity;
        current.revenue += item.quantity * item.unitPrice;
        salesByItem.set(item.menuItemId, current);
      }
    }

    return {
      itemCount: items.length,
      items: items.map((item) => ({
        available: item.available,
        name: item.name,
        price: item.price,
        quantitySold: salesByItem.get(String(item._id))?.quantity ?? 0,
        revenue: Number((salesByItem.get(String(item._id))?.revenue ?? 0).toFixed(2)),
      })),
    };
  }
}
