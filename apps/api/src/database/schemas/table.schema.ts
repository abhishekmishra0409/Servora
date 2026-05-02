import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { TableStatus } from '@restaurent/shared';

import { Branch } from './branch.schema';
import { Floor } from './floor.schema';
import { Tenant } from './tenant.schema';

export type RestaurantTableDocument = HydratedDocument<RestaurantTable>;

@Schema({ collection: 'tables', timestamps: true })
export class RestaurantTable {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Tenant.name, required: true, index: true })
  tenantId!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Branch.name, required: true, index: true })
  branchId!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Floor.name, required: true, index: true })
  floorId!: string;

  @Prop({ required: true })
  tableNo!: string;

  @Prop({ default: 4 })
  capacity!: number;

  @Prop({ type: String, enum: TableStatus, default: TableStatus.Free })
  status!: TableStatus;
}

export const RestaurantTableSchema = SchemaFactory.createForClass(RestaurantTable);
RestaurantTableSchema.index({ branchId: 1, tableNo: 1 }, { unique: true });
