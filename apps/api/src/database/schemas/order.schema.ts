import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { BranchServiceMode, OrderStatus } from '@restaurent/shared';

import { Branch } from './branch.schema';
import { TableSession } from './table-session.schema';
import { RestaurantTable } from './table.schema';
import { Tenant } from './tenant.schema';

class OrderItemAddonSnapshot {
  @Prop({ required: true })
  label!: string;

  @Prop({ default: 0 })
  priceDelta!: number;
}

class OrderItemSnapshot {
  @Prop({ required: true })
  menuItemId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  quantity!: number;

  @Prop({ required: true })
  unitPrice!: number;

  @Prop()
  notes?: string;

  @Prop()
  variantLabel?: string;

  @Prop({ type: [OrderItemAddonSnapshot], default: [] })
  addonSnapshots!: OrderItemAddonSnapshot[];
}

export type OrderDocument = HydratedDocument<Order>;

@Schema({ collection: 'orders', timestamps: true })
export class Order {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Tenant.name, required: true, index: true })
  tenantId!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Branch.name, required: true, index: true })
  branchId!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: TableSession.name, required: true })
  tableSessionId!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: RestaurantTable.name, required: true, index: true })
  tableId!: string;

  @Prop({ required: true })
  orderNo!: string;

  @Prop({ type: String, enum: BranchServiceMode, required: true })
  serviceMode!: BranchServiceMode;

  @Prop({ type: String, enum: OrderStatus, required: true })
  status!: OrderStatus;

  @Prop({ default: 'pwa' })
  source!: string;

  @Prop({ default: () => new Date() })
  submittedAt!: Date;

  @Prop()
  confirmedByUserId?: string;

  @Prop({ required: true })
  subtotal!: number;

  @Prop({ required: true })
  taxTotal!: number;

  @Prop({ required: true })
  grandTotal!: number;

  @Prop({ type: [OrderItemSnapshot], default: [] })
  items!: OrderItemSnapshot[];
}

export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ branchId: 1, orderNo: 1 }, { unique: true });
OrderSchema.index({ branchId: 1, status: 1, submittedAt: -1 });
OrderSchema.index({ tableSessionId: 1, submittedAt: -1 });
