import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import type { GuestJwtPayload, GuestSession, BranchServiceMode } from '@restaurent/shared';
import { OrderStatus } from '@restaurent/shared';
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

    const participantId = makeId('participant');
    session.participants.push({
      active: true,
      alias: dto.alias,
      id: participantId,
      joinedAt: new Date(),
    });
    await session.save();

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

    return session;
  }

  async updateBucketItem(
    user: GuestJwtPayload,
    itemId: string,
    dto: UpdateBucketItemDto,
  ): Promise<TableSession> {
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

    return session;
  }

  async removeBucketItem(user: GuestJwtPayload, itemId: string): Promise<TableSession> {
    const session = await this.sessionModel.findById(user.tableSessionId).exec();

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    session.bucket.items = session.bucket.items.filter((item) => item.id !== itemId);
    session.bucket.version += 1;
    this.applyTotals(session);
    session.markModified('bucket');
    await session.save();

    return session;
  }

  async submitBucket(user: GuestJwtPayload, dto: SubmitBucketDto): Promise<{ orderId: string; orderNo: string; status: OrderStatus }> {
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
    const status =
      serviceMode === 'waiter_confirmed' ? OrderStatus.PendingConfirmation : OrderStatus.Accepted;

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
      orderNo: `${tableSession.branchId}-${String(nextCounterValue).padStart(4, '0')}`,
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
