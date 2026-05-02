import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type IdempotencyKeyDocument = HydratedDocument<IdempotencyKey>;

@Schema({ collection: 'idempotency_keys', timestamps: true })
export class IdempotencyKey {
  @Prop({ required: true, index: true })
  tenantId!: string;

  @Prop({ required: true })
  route!: string;

  @Prop({ required: true })
  key!: string;

  @Prop({ type: Object })
  responseBody?: unknown;

  @Prop({ default: 200 })
  statusCode!: number;

  @Prop({ required: true })
  expiresAt!: Date;
}

export const IdempotencyKeySchema = SchemaFactory.createForClass(IdempotencyKey);
IdempotencyKeySchema.index({ tenantId: 1, route: 1, key: 1 }, { unique: true });
IdempotencyKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
