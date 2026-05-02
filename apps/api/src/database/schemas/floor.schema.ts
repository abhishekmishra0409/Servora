import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

import { Branch } from './branch.schema';
import { Tenant } from './tenant.schema';

export type FloorDocument = HydratedDocument<Floor>;

@Schema({ collection: 'floors', timestamps: true })
export class Floor {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Tenant.name, required: true, index: true })
  tenantId!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Branch.name, required: true, index: true })
  branchId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ default: 0 })
  sortOrder!: number;
}

export const FloorSchema = SchemaFactory.createForClass(Floor);
FloorSchema.index({ branchId: 1, name: 1 }, { unique: true });

