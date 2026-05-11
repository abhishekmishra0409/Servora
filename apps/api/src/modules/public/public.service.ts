import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Branch } from '../../database/schemas/branch.schema';
import { Order } from '../../database/schemas/order.schema';
import { Payment } from '../../database/schemas/payment.schema';
import { QrCode } from '../../database/schemas/qr-code.schema';
import { RestaurantTable } from '../../database/schemas/table.schema';
import { TableSession } from '../../database/schemas/table-session.schema';
import { Tenant } from '../../database/schemas/tenant.schema';
import { AccessService } from '../../infrastructure/access/access.service';

@Injectable()
export class PublicService {
  constructor(
    @InjectModel(QrCode.name) private readonly qrCodeModel: Model<QrCode>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<Tenant>,
    @InjectModel(Branch.name) private readonly branchModel: Model<Branch>,
    @InjectModel(RestaurantTable.name) private readonly tableModel: Model<RestaurantTable>,
    @InjectModel(TableSession.name) private readonly sessionModel: Model<TableSession>,
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(Payment.name) private readonly paymentModel: Model<Payment>,
    private readonly accessService: AccessService,
  ) {}

  async getTableContext(qrToken: string): Promise<unknown> {
    if (!qrToken) {
      throw new BadRequestException('qrToken is required');
    }

    const qrCode = await this.qrCodeModel.findOne({ token: qrToken }).lean().exec();

    if (!qrCode) {
      throw new NotFoundException('QR token not found');
    }

    const [tenant, branch, table, session] = await Promise.all([
      this.tenantModel.findById(qrCode.tenantId).lean().exec(),
      this.branchModel.findById(qrCode.branchId).lean().exec(),
      this.tableModel.findById(qrCode.tableId).lean().exec(),
      this.sessionModel
        .findOne({
          qrCodeId: String((qrCode as { _id: unknown })._id),
          status: 'active',
          tableId: qrCode.tableId,
        })
        .lean()
        .exec(),
    ]);

    if (!tenant || !branch || !table) {
      throw new NotFoundException('Table context not found');
    }
    await this.accessService.assertTenantActive(String((tenant as { _id: unknown })._id));

    return {
      branch: {
        id: String((branch as { _id: unknown })._id),
        name: branch.name,
        serviceMode: branch.serviceMode,
        slug: branch.slug,
      },
      qr: {
        id: String((qrCode as { _id: unknown })._id),
        token: qrCode.token,
        version: qrCode.version,
      },
      table: {
        id: String((table as { _id: unknown })._id),
        capacity: table.capacity,
        status: table.status,
        tableNo: table.tableNo,
      },
      tableSession: session
        ? {
            id: String((session as { _id: unknown })._id),
            bucket: this.presentBucket(session.bucket),
            openedAt: session.openedAt,
            participants: session.participants,
            status: session.status,
          }
        : null,
      tenant: {
        id: String((tenant as { _id: unknown })._id),
        legalName: tenant.legalName,
        slug: tenant.slug,
      },
    };
  }

  async getOrderStatus(id: string, qrToken: string): Promise<unknown> {
    if (!qrToken) {
      throw new BadRequestException('qrToken is required');
    }

    const [qrCode, order] = await Promise.all([
      this.qrCodeModel.findOne({ token: qrToken }).lean().exec(),
      this.orderModel.findById(id).lean().exec(),
    ]);

    if (!qrCode || !order || String(order.tableId) !== String(qrCode.tableId)) {
      throw new NotFoundException('Order not found');
    }
    await this.accessService.assertTenantActive(String(qrCode.tenantId));

    return this.mapOrderStatus(order);
  }

  async getOrdersForQr(qrToken: string): Promise<unknown[]> {
    if (!qrToken) {
      throw new BadRequestException('qrToken is required');
    }

    const qrCode = await this.qrCodeModel.findOne({ token: qrToken }).lean().exec();

    if (!qrCode) {
      throw new NotFoundException('QR token not found');
    }
    await this.accessService.assertTenantActive(String(qrCode.tenantId));

    const session = await this.sessionModel
      .findOne({
        qrCodeId: String((qrCode as { _id: unknown })._id),
        status: 'active',
        tableId: qrCode.tableId,
      })
      .lean()
      .exec();

    if (!session) {
      return [];
    }

    const orders = await this.orderModel
      .find({ tableSessionId: String((session as { _id: unknown })._id) })
      .sort({ submittedAt: -1 })
      .lean()
      .exec();

    return orders.map((order) => this.mapOrderStatus(order));
  }

  async getPaymentForOrder(orderId: string, qrToken: string): Promise<unknown> {
    if (!qrToken) {
      throw new BadRequestException('qrToken is required');
    }

    const [qrCode, order] = await Promise.all([
      this.qrCodeModel.findOne({ token: qrToken }).lean().exec(),
      this.orderModel.findById(orderId).lean().exec(),
    ]);

    if (!qrCode || !order || String(order.tableId) !== String(qrCode.tableId)) {
      throw new NotFoundException('Payment not found');
    }
    await this.accessService.assertTenantActive(String(qrCode.tenantId));

    const payment = await this.paymentModel
      .findOne({ $or: [{ orderId }, { orderIds: orderId }] })
      .sort({ updatedAt: -1 })
      .lean()
      .exec();
    return payment
      ? {
          amount: payment.amount,
          currency: payment.currency,
          id: String((payment as { _id: unknown })._id),
          method: payment.method,
          orderId,
          orderIds: payment.orderIds ?? (payment.orderId ? [payment.orderId] : []),
          provider: payment.provider,
          status: payment.status,
          tableId: payment.tableId,
          tableSessionId: payment.tableSessionId,
        }
      : null;
  }

  private mapOrderStatus(order: Order & { _id: unknown }): unknown {
    return {
      grandTotal: order.grandTotal,
      id: String((order as { _id: unknown })._id),
      items: order.items,
      orderNo: order.orderNo,
      status: order.status,
      submittedAt: order.submittedAt,
      tableId: String(order.tableId),
    };
  }

  private presentBucket(bucket: TableSession['bucket']): TableSession['bucket'] {
    if (bucket.state !== 'locked') {
      return bucket;
    }

    return {
      items: [],
      state: 'open',
      totals: {
        grandTotal: 0,
        subtotal: 0,
        taxTotal: 0,
      },
      version: (bucket.version ?? 0) + 1,
    };
  }
}
