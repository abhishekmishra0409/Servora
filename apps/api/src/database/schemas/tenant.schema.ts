import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TenantDocument = HydratedDocument<Tenant>;

@Schema({ collection: 'tenants', timestamps: true })
export class Tenant {
  @Prop({ required: true, unique: true })
  slug!: string;

  @Prop({ required: true })
  legalName!: string;

  @Prop({ default: 'active' })
  status!: string;

  @Prop({ default: 'INR' })
  defaultCurrency!: string;

  @Prop({ default: 'Asia/Kolkata' })
  defaultTimezone!: string;

  @Prop({ type: [String], default: [] })
  enabledFeatures!: string[];

  /**
   * Per-tenant entitlement overrides for custom deals. Any limit set here wins
   * over the plan's value; absent keys inherit. Kept on the tenant document
   * because it is already loaded on every access check.
   */
  @Prop({ type: Object, default: {} })
  entitlementOverrides!: Record<string, unknown>;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);
