import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SubscriptionPlanDocument = HydratedDocument<SubscriptionPlan>;

@Schema({ collection: 'subscription_plans', timestamps: true })
export class SubscriptionPlan {
  @Prop({ required: true, unique: true })
  code!: string;

  @Prop()
  name?: string;

  @Prop()
  monthlyPrice?: number;

  @Prop({ default: true })
  active!: boolean;

  @Prop()
  badge?: string;

  @Prop()
  description?: string;

  @Prop({ default: true })
  visible!: boolean;

  @Prop({ default: 0 })
  sortOrder!: number;

  @Prop({ default: 0 })
  employeeLimit!: number;

  @Prop({ default: 0 })
  branchLimit!: number;

  @Prop({ default: 0 })
  tableLimit!: number;

  @Prop({ default: 0 })
  monthlyBillLimit!: number;

  @Prop({ type: [String], default: [] })
  perks!: string[];
}

export const SubscriptionPlanSchema = SchemaFactory.createForClass(SubscriptionPlan);
