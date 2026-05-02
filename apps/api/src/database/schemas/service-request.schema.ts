import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { ServiceRequestStatus } from '@restaurent/shared';

import { Branch } from './branch.schema';
import { TableSession } from './table-session.schema';
import { RestaurantTable } from './table.schema';
import { Tenant } from './tenant.schema';

export type ServiceRequestDocument = HydratedDocument<ServiceRequest>;

@Schema({ collection: 'service_requests', timestamps: true })
export class ServiceRequest {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Tenant.name, required: true, index: true })
  tenantId!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Branch.name, required: true, index: true })
  branchId!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: TableSession.name, required: true, index: true })
  tableSessionId!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: RestaurantTable.name, required: true, index: true })
  tableId!: string;

  @Prop({ required: true })
  requestType!: string;

  @Prop()
  message?: string;

  @Prop({ type: String, enum: ServiceRequestStatus, default: ServiceRequestStatus.Open })
  status!: ServiceRequestStatus;

  @Prop()
  assignedUserId?: string;

  @Prop()
  resolvedAt?: Date;
}

export const ServiceRequestSchema = SchemaFactory.createForClass(ServiceRequest);
