import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { UserRole } from '@restaurent/shared';

import { Branch } from './branch.schema';
import { Tenant } from './tenant.schema';
import { User } from './user.schema';

export type MembershipDocument = HydratedDocument<Membership>;

@Schema({ collection: 'memberships', timestamps: true })
export class Membership {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Tenant.name, required: true, index: true })
  tenantId!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Branch.name, index: true })
  branchId?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: User.name, required: true, index: true })
  userId!: string;

  @Prop({ type: String, enum: UserRole, required: true })
  role!: UserRole;
}

export const MembershipSchema = SchemaFactory.createForClass(Membership);
MembershipSchema.index({ tenantId: 1, userId: 1, branchId: 1 }, { unique: true });
