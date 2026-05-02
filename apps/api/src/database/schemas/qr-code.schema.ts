import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

import { Branch } from './branch.schema';
import { RestaurantTable } from './table.schema';
import { Tenant } from './tenant.schema';

export type QrCodeDocument = HydratedDocument<QrCode>;

@Schema({ collection: 'qr_codes', timestamps: true })
export class QrCode {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Tenant.name, required: true, index: true })
  tenantId!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Branch.name, required: true, index: true })
  branchId!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: RestaurantTable.name, required: true })
  tableId!: string;

  @Prop({ required: true, unique: true })
  token!: string;

  @Prop({ default: 1 })
  version!: number;
}

export const QrCodeSchema = SchemaFactory.createForClass(QrCode);
QrCodeSchema.index({ tableId: 1 }, { unique: true });
