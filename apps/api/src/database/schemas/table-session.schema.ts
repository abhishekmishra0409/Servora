import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

import { Branch } from './branch.schema';
import { QrCode } from './qr-code.schema';
import { RestaurantTable } from './table.schema';
import { Tenant } from './tenant.schema';

class Participant {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true })
  alias!: string;

  @Prop({ default: () => new Date() })
  joinedAt!: Date;

  @Prop({ default: true })
  active!: boolean;
}

class BucketItemAddon {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true })
  label!: string;

  @Prop({ default: 0 })
  priceDelta!: number;
}

class BucketItem {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true })
  menuItemId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  quantity!: number;

  @Prop({ required: true })
  price!: number;

  @Prop()
  variantId?: string;

  @Prop()
  variantLabel?: string;

  @Prop({ default: 0 })
  variantPriceDelta?: number;

  @Prop({ type: [BucketItemAddon], default: [] })
  addons!: BucketItemAddon[];

  @Prop()
  notes?: string;

  @Prop({ required: true })
  addedByParticipantId!: string;
}

class BucketTotals {
  @Prop({ default: 0 })
  subtotal!: number;

  @Prop({ default: 0 })
  taxTotal!: number;

  @Prop({ default: 0 })
  grandTotal!: number;
}

class Bucket {
  @Prop({ type: [BucketItem], default: [] })
  items!: BucketItem[];

  @Prop({ type: BucketTotals, default: () => ({}) })
  totals!: BucketTotals;

  @Prop({ default: 'open' })
  state!: 'open' | 'locked';

  @Prop({ default: 0 })
  version!: number;
}

export type TableSessionDocument = HydratedDocument<TableSession>;

@Schema({ collection: 'table_sessions', timestamps: true })
export class TableSession {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Tenant.name, required: true, index: true })
  tenantId!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Branch.name, required: true, index: true })
  branchId!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: RestaurantTable.name, required: true, index: true })
  tableId!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: QrCode.name, required: true, index: true })
  qrCodeId!: string;

  @Prop({ default: () => new Date() })
  openedAt!: Date;

  @Prop()
  closedAt?: Date;

  @Prop({ default: 'active' })
  status!: 'active' | 'closed';

  @Prop({ type: [Participant], default: [] })
  participants!: Participant[];

  @Prop({ type: Bucket, default: () => ({}) })
  bucket!: Bucket;
}

export const TableSessionSchema = SchemaFactory.createForClass(TableSession);
TableSessionSchema.index(
  { tableId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } },
);

