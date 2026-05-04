import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { GuestJwtPayload } from '@restaurent/shared';
import { ServiceRequestStatus, SOCKET_EVENTS } from '@restaurent/shared';
import { Model } from 'mongoose';

import { ServiceRequest } from '../../database/schemas/service-request.schema';
import { TableSession } from '../../database/schemas/table-session.schema';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { RealtimePublisher } from '../../infrastructure/realtime/realtime-publisher.service';
import { CreateServiceRequestDto } from './dto';

@Injectable()
export class ServiceRequestsService {
  constructor(
    @InjectModel(ServiceRequest.name)
    private readonly serviceRequestModel: Model<ServiceRequest>,
    @InjectModel(TableSession.name)
    private readonly tableSessionModel: Model<TableSession>,
    private readonly auditService: AuditService,
    private readonly queueService: QueueService,
    private readonly realtimePublisher: RealtimePublisher,
  ) {}

  async create(user: GuestJwtPayload, dto: CreateServiceRequestDto): Promise<ServiceRequest> {
    const tableSession = await this.tableSessionModel.findById(user.tableSessionId).lean().exec();

    if (!tableSession) {
      throw new NotFoundException('Table session not found');
    }

    const request = await this.serviceRequestModel.create({
      branchId: user.branchId,
      requestType: dto.requestType,
      status: ServiceRequestStatus.Open,
      tableId: tableSession.tableId,
      tableSessionId: user.tableSessionId,
      tenantId: user.tenantId,
      ...(dto.message ? { message: dto.message } : {}),
    });
    await Promise.all([
      this.queueService.enqueueNotificationJob(
        'notifications.service_request_created',
        {
          branchId: request.branchId,
          requestId: String(request._id),
          tableId: request.tableId,
          tenantId: request.tenantId,
        },
        { jobId: `service-request-created:${String(request._id)}` },
      ),
      this.realtimePublisher.publishRealtimeEvent(`branch:${request.branchId}`, SOCKET_EVENTS.serviceRequestCreated, {
        requestId: String(request._id),
        status: request.status,
        tableId: request.tableId,
      }),
      this.auditService.record({
        action: 'service_request.created',
        branchId: request.branchId,
        entityId: String(request._id),
        entityType: 'service_request',
        payload: { requestType: request.requestType },
        tenantId: request.tenantId,
      }),
    ]);
    return request;
  }

  async list(branchId: string): Promise<ServiceRequest[]> {
    return this.serviceRequestModel
      .find({ branchId, status: { $in: [ServiceRequestStatus.Open, ServiceRequestStatus.Assigned] } })
      .sort({ createdAt: 1 })
      .lean()
      .exec();
  }

  async resolve(id: string, actorUserId?: string): Promise<ServiceRequest> {
    const request = await this.serviceRequestModel
      .findByIdAndUpdate(
        id,
        { resolvedAt: new Date(), status: ServiceRequestStatus.Resolved },
        { returnDocument: 'after' },
      )
      .exec();

    if (!request) {
      throw new NotFoundException('Service request not found');
    }

    await Promise.all([
      this.queueService.enqueueNotificationJob(
        'notifications.service_request_resolved',
        {
          branchId: request.branchId,
          requestId: String(request._id),
          tableId: request.tableId,
          tenantId: request.tenantId,
        },
        { jobId: `service-request-resolved:${String(request._id)}` },
      ),
      this.realtimePublisher.publishRealtimeEvent(`branch:${request.branchId}`, SOCKET_EVENTS.serviceRequestResolved, {
        requestId: String(request._id),
        status: request.status,
        tableId: request.tableId,
      }),
      this.auditService.record({
        action: 'service_request.resolved',
        actorUserId,
        branchId: request.branchId,
        entityId: String(request._id),
        entityType: 'service_request',
        tenantId: request.tenantId,
      }),
    ]);
    return request;
  }
}
