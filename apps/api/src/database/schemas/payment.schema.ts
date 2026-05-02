import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { PaymentStatus } from '@restaurent/shared';

import { Branch } from './branch.schema';
import { Order } from './order.schema';
import { Tenant } from './tenant.schema';

export type PaymentDocument = HydratedDocument<Payment>;

@Schema({ collection: 'payments', timestamps: true })
export class Payment {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Tenant.name, required: true, index: true })
  tenantId!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Branch.name, required: true, index: true })
  branchId!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Order.name, index: true })
  orderId?: string;

  @Prop({ required: true })
  provider!: string;

  @Prop()
  providerPaymentId?: string;

  @Prop({ required: true })
  amount!: number;

  @Prop({ default: 'INR' })
  currency!: string;

  @Prop({ default: 'pay_later' })
  method!: string;

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.Pending })
  status!: PaymentStatus;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
