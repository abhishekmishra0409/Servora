import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

import { Tenant } from './tenant.schema';
import { User } from './user.schema';

export type RoleDocument = HydratedDocument<Role>;

/**
 * A tenant-defined role.
 *
 * Built-in roles (owner, manager, waiter, kitchen, cashier) are NOT stored
 * here — they stay in code so shipping a permission change to all tenants is a
 * one-line edit rather than a backfill. Custom roles are purely additive, and
 * a tenant creates one by duplicating a built-in template.
 */
@Schema({ collection: 'roles', timestamps: true })
export class Role {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Tenant.name, required: true, index: true })
  tenantId!: string;

  /** Slugified, stable, unique per tenant. Stored on `Membership.role`. */
  @Prop({ required: true })
  key!: string;

  @Prop({ required: true })
  name!: string;

  @Prop()
  description?: string;

  /** Permission strings from the shared registry, stored sorted and deduped. */
  @Prop({ type: [String], default: [] })
  permissions!: string[];

  /** The built-in role this was duplicated from. Provenance only. */
  @Prop()
  derivedFrom?: string;

  @Prop({ default: true })
  active!: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: User.name })
  createdBy?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: User.name })
  updatedBy?: string;
}

export const RoleSchema = SchemaFactory.createForClass(Role);
RoleSchema.index({ tenantId: 1, key: 1 }, { unique: true });
