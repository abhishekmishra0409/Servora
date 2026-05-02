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
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);

