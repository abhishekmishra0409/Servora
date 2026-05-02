import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

import { Subscription } from './subscription.schema';
import { Tenant } from './tenant.schema';

export type InvoiceDocument = HydratedDocument<Invoice>;

@Schema({ collection: 'invoices', timestamps: true })
export class Invoice {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Tenant.name, required: true, index: true })
  tenantId!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Subscription.name, index: true })
  subscriptionId?: string;

  @Prop({ required: true })
  providerInvoiceId!: string;

  @Prop({ required: true })
  amount!: number;

  @Prop({ default: 'INR' })
  currency!: string;

  @Prop({ default: 'pending' })
  status!: string;

  @Prop()
  invoiceUrl?: string;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);
InvoiceSchema.index({ providerInvoiceId: 1 }, { unique: true });

