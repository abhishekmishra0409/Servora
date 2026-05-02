import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { BranchServiceMode } from '@restaurent/shared';

import { Tenant } from './tenant.schema';

export type BranchDocument = HydratedDocument<Branch>;

@Schema({ collection: 'branches', timestamps: true })
export class Branch {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Tenant.name, required: true, index: true })
  tenantId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  slug!: string;

  @Prop({ type: String, enum: BranchServiceMode, default: BranchServiceMode.Hybrid })
  serviceMode!: BranchServiceMode;

  @Prop({ type: Object, default: {} })
  address!: Record<string, unknown>;

  @Prop({ type: Object, default: {} })
  hours!: Record<string, unknown>;
}

export const BranchSchema = SchemaFactory.createForClass(Branch);
BranchSchema.index({ tenantId: 1, slug: 1 }, { unique: true });
