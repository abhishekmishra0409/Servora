import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { SubscriptionStatus } from '@restaurent/shared';

import { Tenant } from './tenant.schema';

export type SubscriptionDocument = HydratedDocument<Subscription>;

@Schema({ collection: 'subscriptions', timestamps: true })
export class Subscription {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Tenant.name, required: true, index: true })
  tenantId!: string;

  @Prop({ required: true })
  provider!: 'stripe';

  @Prop({ required: true })
  providerCustomerId!: string;

  @Prop({ required: true })
  providerSubscriptionId!: string;

  @Prop({ required: true })
  planCode!: string;

  @Prop({ type: String, enum: SubscriptionStatus, default: SubscriptionStatus.Trialing })
  status!: SubscriptionStatus;

  @Prop()
  trialEndsAt?: Date;

  @Prop()
  renewsAt?: Date;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
SubscriptionSchema.index({ provider: 1, providerSubscriptionId: 1 }, { unique: true });
