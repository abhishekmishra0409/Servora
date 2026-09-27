import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
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

  /**
   * Role key: a built-in `UserRole` value or the `key` of a tenant-defined
   * Role document. Deliberately not a schema enum — custom keys are unbounded,
   * so validation lives in the service layer against the tenant's role set.
   */
  @Prop({ type: String, required: true, index: true })
  role!: string;

  /** Set only for tenant-defined roles; lets role deletion check for holders. */
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Role' })
  roleId?: string;
}

export const MembershipSchema = SchemaFactory.createForClass(Membership);
MembershipSchema.index({ tenantId: 1, userId: 1, branchId: 1 }, { unique: true });
// Supports the "is this role still assigned?" check before a role is deleted.
MembershipSchema.index({ tenantId: 1, role: 1 });
