import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { GuestJwtPayload } from '@restaurent/shared';
import { ServiceRequestStatus } from '@restaurent/shared';
import { Model } from 'mongoose';

import { ServiceRequest } from '../../database/schemas/service-request.schema';
import { TableSession } from '../../database/schemas/table-session.schema';
import { CreateServiceRequestDto } from './dto';

@Injectable()
export class ServiceRequestsService {
  constructor(
    @InjectModel(ServiceRequest.name)
    private readonly serviceRequestModel: Model<ServiceRequest>,
    @InjectModel(TableSession.name)
    private readonly tableSessionModel: Model<TableSession>,
  ) {}

  async create(user: GuestJwtPayload, dto: CreateServiceRequestDto): Promise<ServiceRequest> {
    const tableSession = await this.tableSessionModel.findById(user.tableSessionId).lean().exec();

    if (!tableSession) {
      throw new NotFoundException('Table session not found');
    }

    return this.serviceRequestModel.create({
      branchId: user.branchId,
      requestType: dto.requestType,
      status: ServiceRequestStatus.Open,
      tableId: tableSession.tableId,
      tableSessionId: user.tableSessionId,
      tenantId: user.tenantId,
      ...(dto.message ? { message: dto.message } : {}),
    });
  }

  async list(branchId: string): Promise<ServiceRequest[]> {
    return this.serviceRequestModel
      .find({ branchId, status: { $in: [ServiceRequestStatus.Open, ServiceRequestStatus.Assigned] } })
      .sort({ createdAt: 1 })
      .lean()
      .exec();
  }

  async resolve(id: string): Promise<ServiceRequest> {
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

    return request;
  }
}
