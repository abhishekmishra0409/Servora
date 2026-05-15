import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import type { GuestJwtPayload, GuestSession } from '@restaurent/shared';
import { BranchServiceMode, OrderStatus, SOCKET_EVENTS, TableStatus } from '@restaurent/shared';
import { ClientSession, Connection, Model } from 'mongoose';

import { makeId } from '../../common/utils/id';
import { calculateTotals } from '../../common/utils/pricing';
import { Branch } from '../../database/schemas/branch.schema';
import { Counter } from '../../database/schemas/counter.schema';
import { MenuItem } from '../../database/schemas/menu-item.schema';
import { Order } from '../../database/schemas/order.schema';
import { QrCode } from '../../database/schemas/qr-code.schema';
import { TableSession } from '../../database/schemas/table-session.schema';
import { RestaurantTable } from '../../database/schemas/table.schema';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { AccessService } from '../../infrastructure/access/access.service';
import { RealtimePublisher } from '../../infrastructure/realtime/realtime-publisher.service';
import {
  AddBucketItemDto,
  CreateGuestSessionDto,
  JoinTableSessionDto,
  SubmitBucketDto,
  UpdateBucketItemDto,
} from './dto';

@Injectable()
export class SessionsService {
  constructor(
    @InjectModel(QrCode.name) private readonly qrCodeModel: Model<QrCode>,
    @InjectModel(TableSession.name) private readonly sessionModel: Model<TableSession>,
    @InjectModel(RestaurantTable.name) private readonly tableModel: Model<RestaurantTable>,
    @InjectModel(MenuItem.name) private readonly itemModel: Model<MenuItem>,
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(Counter.name) private readonly counterModel: Model<Counter>,
    @InjectModel(Branch.name) private readonly branchModel: Model<Branch>,
    @InjectConnection() private readonly connection: Connection,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly accessService: AccessService,
    private readonly realtimePublisher: RealtimePublisher,
  ) {}

  async createGuestSession(dto: CreateGuestSessionDto): Promise<GuestSession> {
    return this.joinSession(dto);
  }

  async joinTableSession(dto: JoinTableSessionDto): Promise<GuestSession> {
    return this.joinSession(dto);
  }

  private async joinSession(dto: CreateGuestSessionDto): Promise<GuestSession> {
    const qrCode = await this.qrCodeModel.findOne({ token: dto.qrToken }).exec();

    if (!qrCode) {
      throw new NotFoundException('QR token not found');
    }
    await this.accessService.assertTenantActive(String(qrCode.tenantId));

    let session = await this.sessionModel
      .findOne({
        qrCodeId: String(qrCode._id),
        status: 'active',
        tableId: qrCode.tableId,
      })
      .exec();

    if (!session) {
      session = await this.sessionModel.create({
        branchId: qrCode.branchId,
        bucket: {
          items: [],
          state: 'open',
          totals: {
            grandTotal: 0,
            subtotal: 0,
            taxTotal: 0,
          },
          version: 0,
        },
        participants: [],
        qrCodeId: String(qrCode._id),
        status: 'active',
        tableId: qrCode.tableId,
        tenantId: qrCode.tenantId,
      });
    }

    await this.markTableOccupiedIfFree(qrCode);

    const participantId = makeId('participant');
    session.participants.push({
      active: true,
      alias: dto.alias,
      id: participantId,
      joinedAt: new Date(),
    });
    await session.save();
    await this.realtimePublisher.publishRealtimeEvent(`tableSession:${String(session._id)}`, SOCKET_EVENTS.participantJoined, {
      alias: dto.alias,
      participantId,
      tableSessionId: String(session._id),
    });

    const payload: GuestJwtPayload = {
      alias: dto.alias,
      branchId: session.branchId,
      participantId,
      sub: participantId,
      tableSessionId: String(session._id),
      tenantId: session.tenantId,
      type: 'guest',
    };

    const guestToken = await this.jwtService.signAsync(
      { ...payload } as Record<string, unknown>,
      {
        expiresIn: this.configService.getOrThrow<string>('auth.guestTtl'),
        secret: this.configService.getOrThrow<string>('auth.guestSecret'),
      } as any,
    );

    return {
      alias: dto.alias,
      guestToken,
      participantId,
      tableSessionId: String(session._id),
    };
  }

  async addBucketItem(user: GuestJwtPayload, dto: AddBucketItemDto): Promise<TableSession> {
    await this.accessService.assertTenantActive(user.tenantId);
    const [session, item] = await Promise.all([
      this.sessionModel.findById(user.tableSessionId).exec(),
      this.itemModel.findById(dto.menuItemId).exec(),
    ]);

    if (!session || !item) {
      throw new NotFoundException('Session or menu item not found');
    }

    if (session.bucket.state === 'locked') {
      this.resetBucket(session);
    }

    const selectedVariant = item.variants.find((variant) => variant.id === dto.variantId);
    const bucketItem: any = {
      addedByParticipantId: user.participantId,
      addons: dto.addons ?? [],
      id: makeId('bucket'),
      menuItemId: String(item._id),
      name: item.name,
      price: item.price,
      quantity: dto.quantity,
      variantPriceDelta: selectedVariant?.priceDelta ?? 0,
      ...(dto.notes ? { notes: dto.notes } : {}),
      ...(dto.variantId ? { variantId: dto.variantId } : {}),
      ...(selectedVariant?.label ? { variantLabel: selectedVariant.label } : {}),
    };

    session.bucket.items.push(bucketItem);
    session.bucket.version += 1;
    this.applyTotals(session);
    session.markModified('bucket');
    await session.save();
    await this.realtimePublisher.publishRealtimeEvent(`tableSession:${String(session._id)}`, SOCKET_EVENTS.bucketItemAdded, {
      itemId: bucketItem.id,
      quantity: bucketItem.quantity,
      tableSessionId: String(session._id),
      total: session.bucket.totals.grandTotal,
    });

    return session;
  }

  async updateBucketItem(
    user: GuestJwtPayload,
    itemId: string,
    dto: UpdateBucketItemDto,
  ): Promise<TableSession> {
    await this.accessService.assertTenantActive(user.tenantId);
    const session = await this.sessionModel.findById(user.tableSessionId).exec();

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const bucketItem = session.bucket.items.find((item) => item.id === itemId);

    if (!bucketItem) {
      throw new NotFoundException('Bucket item not found');
    }

    bucketItem.quantity = dto.quantity ?? bucketItem.quantity;
    if (dto.notes !== undefined) {
      bucketItem.notes = dto.notes;
    }
    session.bucket.version += 1;
    this.applyTotals(session);
    session.markModified('bucket');
    await session.save();
    await this.realtimePublisher.publishRealtimeEvent(`tableSession:${String(session._id)}`, SOCKET_EVENTS.bucketItemUpdated, {
      itemId,
      quantity: bucketItem.quantity,
      tableSessionId: String(session._id),
      total: session.bucket.totals.grandTotal,
    });

    return session;
  }

  async removeBucketItem(user: GuestJwtPayload, itemId: string): Promise<TableSession> {
    await this.accessService.assertTenantActive(user.tenantId);
    const session = await this.sessionModel.findById(user.tableSessionId).exec();

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    session.bucket.items = session.bucket.items.filter((item) => item.id !== itemId);
    session.bucket.version += 1;
    this.applyTotals(session);
    session.markModified('bucket');
    await session.save();
    await this.realtimePublisher.publishRealtimeEvent(`tableSession:${String(session._id)}`, SOCKET_EVENTS.bucketItemRemoved, {
      itemId,
      quantity: 0,
      tableSessionId: String(session._id),
      total: session.bucket.totals.grandTotal,
    });

    return session;
  }

  async submitBucket(user: GuestJwtPayload, dto: SubmitBucketDto): Promise<{ orderId: string; orderNo: string; status: OrderStatus }> {
    await this.accessService.assertTenantActive(user.tenantId);
    const mongoSession = await this.connection.startSession();

    try {
      return await mongoSession.withTransaction(async () => this.submitBucketInternal(user, dto, mongoSession));
    } catch (error) {
      if (this.isTransactionUnsupportedError(error)) {
        return this.submitBucketInternal(user, dto);
      }

      throw error;
    } finally {
      await mongoSession.endSession();
    }
  }

  private applyTotals(session: TableSession): void {
    const totals = calculateTotals(
      session.bucket.items.map((item) => ({
        addons: item.addons,
        price: item.price,
        quantity: item.quantity,
        variantPriceDelta: item.variantPriceDelta ?? 0,
      })),
    );

    session.bucket.totals = totals;
  }

  private async markTableOccupiedIfFree(qrCode: QrCode): Promise<void> {
    const table = await this.tableModel
      .findOneAndUpdate(
        { _id: qrCode.tableId, status: TableStatus.Free },
        { status: TableStatus.Occupied },
        { returnDocument: 'after' },
      )
      .exec();

    if (!table) {
      return;
    }

    await this.realtimePublisher.publishRealtimeEvent(`branch:${qrCode.branchId}`, 'table.status_changed', {
      source: 'table_session_join',
      status: TableStatus.Occupied,
      tableId: String(table._id),
    });
  }

  private async submitBucketInternal(
    user: GuestJwtPayload,
    dto: SubmitBucketDto,
    mongoSession?: ClientSession,
  ): Promise<{ orderId: string; orderNo: string; status: OrderStatus }> {
    const tableSessionQuery = this.sessionModel.findById(user.tableSessionId);
    const tableSession = mongoSession
      ? await tableSessionQuery.session(mongoSession).exec()
      : await tableSessionQuery.exec();

    if (!tableSession) {
      throw new NotFoundException('Session not found');
    }

    if (tableSession.bucket.state === 'locked') {
      const existingOrder = await this.orderModel
        .exists({ tableSessionId: String(tableSession._id) })
        .session(mongoSession ?? null)
        .exec();

      if (existingOrder) {
        this.resetBucket(tableSession);
        tableSession.markModified('bucket');
        await tableSession.save(mongoSession ? { session: mongoSession } : undefined);
        throw new BadRequestException('This bucket was already submitted. Add new items to start another order.');
      }
    }

    if (!tableSession.bucket.items.length) {
      throw new BadRequestException('Add at least one item before submitting.');
    }

    const branchQuery = this.branchModel.findById(tableSession.branchId);
    const branch = mongoSession ? await branchQuery.session(mongoSession).exec() : await branchQuery.exec();

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    const counterQuery = this.counterModel.findOneAndUpdate(
      {
        branchId: tableSession.branchId,
        name: 'order',
        tenantId: tableSession.tenantId,
      },
      {
        $inc: { value: 1 },
      },
      {
        returnDocument: 'after',
        ...(mongoSession ? { session: mongoSession } : {}),
        upsert: true,
      },
    );
    const counter = await counterQuery.exec();

    const serviceMode = branch.serviceMode as BranchServiceMode;
    const nextCounterValue = counter?.value ?? 1;
    const status = this.initialOrderStatus(serviceMode);

    const createdOrder = await this.createOrderDocument(
      tableSession,
      dto,
      serviceMode,
      status,
      nextCounterValue,
      mongoSession,
    );

    this.resetBucket(tableSession);
    tableSession.markModified('bucket');
    await tableSession.save(mongoSession ? { session: mongoSession } : undefined);

    await Promise.all([
      this.realtimePublisher.publishRealtimeEvent(`branch:${createdOrder.branchId}`, SOCKET_EVENTS.orderCreated, {
        orderId: String(createdOrder._id),
        status: createdOrder.status,
      }),
      this.realtimePublisher.publishRealtimeEvent(`tableSession:${String(tableSession._id)}`, SOCKET_EVENTS.orderCreated, {
        orderId: String(createdOrder._id),
        status: createdOrder.status,
      }),
      this.auditService.record({
        action: 'order.created',
        branchId: createdOrder.branchId,
        entityId: String(createdOrder._id),
        entityType: 'order',
        payload: { orderNo: createdOrder.orderNo, status: createdOrder.status },
        tenantId: createdOrder.tenantId,
      }),
    ]);

    return this.mapOrderResponse(createdOrder);
  }

  private isTransactionUnsupportedError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    return /Transaction numbers are only allowed on a replica set member or mongos/i.test(
      error.message,
    );
  }

  private initialOrderStatus(serviceMode: BranchServiceMode): OrderStatus {
    return serviceMode === BranchServiceMode.SelfService
      ? OrderStatus.Accepted
      : OrderStatus.PendingConfirmation;
  }

  private async createOrderDocument(
    tableSession: TableSession & { _id: unknown },
    dto: SubmitBucketDto,
    serviceMode: BranchServiceMode,
    status: OrderStatus,
    nextCounterValue: number,
    mongoSession?: ClientSession,
  ): Promise<Order & { _id: unknown }> {
    const createdOrder = new this.orderModel({
      branchId: tableSession.branchId,
      grandTotal: tableSession.bucket.totals.grandTotal,
      items: tableSession.bucket.items.map((item) => ({
        addonSnapshots: item.addons.map((addon) => ({
          label: addon.label,
          priceDelta: addon.priceDelta,
        })),
        menuItemId: item.menuItemId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.price + (item.variantPriceDelta ?? 0),
        ...(item.notes ? { notes: item.notes } : {}),
        ...(item.variantLabel ? { variantLabel: item.variantLabel } : {}),
      })),
      orderNo: `ORD-${String(nextCounterValue).padStart(4, '0')}`,
      serviceMode,
      source: dto.paymentMethod ?? 'pay_later',
      status,
      subtotal: tableSession.bucket.totals.subtotal,
      tableId: tableSession.tableId,
      tableSessionId: String(tableSession._id),
      taxTotal: tableSession.bucket.totals.taxTotal,
      tenantId: tableSession.tenantId,
    });

    await createdOrder.save(mongoSession ? { session: mongoSession } : undefined);
    return createdOrder as Order & { _id: unknown };
  }

  private mapOrderResponse(order: Order & { _id: unknown }): { orderId: string; orderNo: string; status: OrderStatus } {
    return {
      orderId: String(order._id),
      orderNo: order.orderNo,
      status: order.status,
    };
  }

  private resetBucket(tableSession: TableSession): void {
    const nextVersion = (tableSession.bucket?.version ?? 0) + 1;
    tableSession.bucket = {
      items: [],
      state: 'open',
      totals: {
        grandTotal: 0,
        subtotal: 0,
        taxTotal: 0,
      },
      version: nextVersion,
    };
  }
}
