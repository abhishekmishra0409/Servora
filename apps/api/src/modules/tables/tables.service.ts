import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OrderStatus, TableStatus } from '@restaurent/shared';

import { makeId } from '../../common/utils/id';
import { Order } from '../../database/schemas/order.schema';
import { QrCode } from '../../database/schemas/qr-code.schema';
import { RestaurantTable } from '../../database/schemas/table.schema';
import { CreateTableDto, RegenerateQrDto, UpdateTableDto } from './dto';

@Injectable()
export class TablesService {
  constructor(
    @InjectModel(RestaurantTable.name)
    private readonly tableModel: Model<RestaurantTable>,
    @InjectModel(QrCode.name)
    private readonly qrCodeModel: Model<QrCode>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<Order>,
  ) {}

  async list(branchId: string): Promise<unknown[]> {
    const tables = await this.tableModel.find({ branchId }).sort({ tableNo: 1 }).lean().exec();
    const tableIds = tables.map((table) => String(table._id));
    const [qrCodes, liveOrders] = await Promise.all([
      this.qrCodeModel.find({ tableId: { $in: tableIds } }).lean().exec(),
      this.orderModel
        .find({
          branchId,
          status: {
            $in: [
              OrderStatus.PendingConfirmation,
              OrderStatus.Accepted,
              OrderStatus.Preparing,
              OrderStatus.Ready,
            ],
          },
          tableId: { $in: tableIds },
        })
        .lean()
        .exec(),
    ]);
    const qrMap = new Map(qrCodes.map((qr) => [String(qr.tableId), qr]));
    const ordersByTable = new Map<string, Order[]>();

    for (const order of liveOrders) {
      const tableId = String(order.tableId);
      ordersByTable.set(tableId, [...(ordersByTable.get(tableId) ?? []), order as Order]);
    }

    return tables.map((table) => {
      const tableOrders = ordersByTable.get(String(table._id)) ?? [];

      return {
        ...table,
        activeOrderCount: tableOrders.length,
        qrToken: qrMap.get(String(table._id))?.token ?? null,
        status: this.deriveTableStatus(table.status, tableOrders),
      };
    });
  }

  async create(dto: CreateTableDto): Promise<RestaurantTable> {
    const table = await this.tableModel.create({
      ...dto,
      capacity: dto.capacity ?? 4,
      status: TableStatus.Free,
    });

    await this.qrCodeModel.create({
      branchId: dto.branchId,
      tableId: String(table._id),
      tenantId: dto.tenantId,
      token: makeId('qr'),
      version: 1,
    });

    return table;
  }

  async update(id: string, dto: UpdateTableDto): Promise<RestaurantTable> {
    const table = await this.tableModel
      .findByIdAndUpdate(id, dto, { returnDocument: 'after' })
      .exec();

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    return table;
  }

  async delete(id: string): Promise<{ success: boolean }> {
    await this.tableModel.findByIdAndDelete(id).exec();
    await this.qrCodeModel.deleteMany({ tableId: id }).exec();
    return { success: true };
  }

  async regenerateQr(dto: RegenerateQrDto): Promise<{ token: string; version: number }> {
    const qrCode = await this.qrCodeModel.findOne({ tableId: dto.tableId }).exec();

    if (!qrCode) {
      throw new NotFoundException('QR code not found');
    }

    qrCode.token = makeId('qr');
    qrCode.version += 1;
    await qrCode.save();

    return {
      token: qrCode.token,
      version: qrCode.version,
    };
  }

  private deriveTableStatus(currentStatus: TableStatus, orders: Order[]): TableStatus {
    if (orders.some((order) => order.status === OrderStatus.Ready)) {
      return TableStatus.Ready;
    }

    if (orders.some((order) => order.status === OrderStatus.Preparing)) {
      return TableStatus.Preparing;
    }

    if (orders.some((order) => order.status === OrderStatus.PendingConfirmation)) {
      return TableStatus.WaitingConfirmation;
    }

    if (orders.some((order) => order.status === OrderStatus.Accepted)) {
      return TableStatus.Occupied;
    }

    return currentStatus;
  }
}
