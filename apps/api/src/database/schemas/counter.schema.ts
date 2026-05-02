import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CounterDocument = HydratedDocument<Counter>;

@Schema({ collection: 'counters', timestamps: true })
export class Counter {
  @Prop({ required: true, index: true })
  tenantId!: string;

  @Prop({ required: true, index: true })
  branchId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ default: 0 })
  value!: number;
}

export const CounterSchema = SchemaFactory.createForClass(Counter);
CounterSchema.index({ tenantId: 1, branchId: 1, name: 1 }, { unique: true });

