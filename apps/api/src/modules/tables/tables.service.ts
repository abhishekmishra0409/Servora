import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OrderStatus, TableStatus } from '@restaurent/shared';

import { makeId } from '../../common/utils/id';
import { Order } from '../../database/schemas/order.schema';
import { QrCode } from '../../database/schemas/qr-code.schema';
import { RestaurantTable } from '../../database/schemas/table.schema';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { RealtimePublisher } from '../../infrastructure/realtime/realtime-publisher.service';
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
    private readonly auditService: AuditService,
    private readonly realtimePublisher: RealtimePublisher,
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

  async create(dto: CreateTableDto, actorUserId?: string): Promise<RestaurantTable> {
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
    await this.auditService.record({
      action: 'table.created',
      actorUserId,
      branchId: dto.branchId,
      entityId: String(table._id),
      entityType: 'table',
      tenantId: dto.tenantId,
    });

    return table;
  }

  async update(id: string, dto: UpdateTableDto, actorUserId?: string): Promise<RestaurantTable> {
    const table = await this.tableModel
      .findByIdAndUpdate(id, dto, { returnDocument: 'after' })
      .exec();

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    await Promise.all([
      this.auditService.record({
        action: 'table.updated',
        actorUserId,
        branchId: table.branchId,
        entityId: String(table._id),
        entityType: 'table',
        tenantId: table.tenantId,
      }),
      this.realtimePublisher.publishRealtimeEvent(`branch:${table.branchId}`, 'table.status_changed', {
        tableId: String(table._id),
        status: table.status,
      }),
    ]);
    return table;
  }

  async delete(id: string, actorUserId?: string): Promise<{ success: boolean }> {
    const table = await this.tableModel.findByIdAndDelete(id).exec();
    await this.qrCodeModel.deleteMany({ tableId: id }).exec();
    if (table) {
      await this.auditService.record({
        action: 'table.deleted',
        actorUserId,
        branchId: table.branchId,
        entityId: String(table._id),
        entityType: 'table',
        tenantId: table.tenantId,
      });
    }
    return { success: true };
  }

  async regenerateQr(dto: RegenerateQrDto, actorUserId?: string): Promise<{ token: string; version: number }> {
    const qrCode = await this.qrCodeModel.findOne({ tableId: dto.tableId }).exec();

    if (!qrCode) {
      throw new NotFoundException('QR code not found');
    }

    qrCode.token = makeId('qr');
    qrCode.version += 1;
    await qrCode.save();
    await this.auditService.record({
      action: 'table.qr_regenerated',
      actorUserId,
      branchId: qrCode.branchId,
      entityId: qrCode.tableId,
      entityType: 'table',
      tenantId: qrCode.tenantId,
    });

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
