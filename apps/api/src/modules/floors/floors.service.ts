import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Floor } from '../../database/schemas/floor.schema';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { RealtimePublisher } from '../../infrastructure/realtime/realtime-publisher.service';
import { CreateFloorDto, UpdateFloorDto } from './dto';

@Injectable()
export class FloorsService {
  constructor(
    @InjectModel(Floor.name) private readonly floorModel: Model<Floor>,
    private readonly auditService: AuditService,
    private readonly realtimePublisher: RealtimePublisher,
  ) {}

  list(branchId: string): Promise<Floor[]> {
    return this.floorModel.find({ branchId }).sort({ sortOrder: 1, name: 1 }).lean().exec();
  }

  async create(dto: CreateFloorDto, actorUserId: string): Promise<Floor> {
    const floor = await this.floorModel.create({ sortOrder: 0, ...dto });
    await this.auditService.record({
      action: 'floor.created',
      actorUserId,
      branchId: dto.branchId,
      entityId: String(floor._id),
      entityType: 'floor',
      tenantId: dto.tenantId,
    });
    await this.realtimePublisher.publishRealtimeEvent(`branch:${dto.branchId}`, 'floor.changed', {
      branchId: dto.branchId,
      changeType: 'created',
      floorId: String(floor._id),
    });
    return floor;
  }

  async update(id: string, dto: UpdateFloorDto, actorUserId: string): Promise<Floor> {
    const floor = await this.floorModel.findByIdAndUpdate(id, dto, { returnDocument: 'after' }).exec();
    if (!floor) {
      throw new NotFoundException('Floor not found');
    }
    await this.auditService.record({
      action: 'floor.updated',
      actorUserId,
      branchId: floor.branchId,
      entityId: String(floor._id),
      entityType: 'floor',
      tenantId: floor.tenantId,
    });
    await this.realtimePublisher.publishRealtimeEvent(`branch:${floor.branchId}`, 'floor.changed', {
      branchId: floor.branchId,
      changeType: 'updated',
      floorId: String(floor._id),
    });
    return floor;
  }

  async delete(id: string, actorUserId: string): Promise<{ success: boolean }> {
    const floor = await this.floorModel.findByIdAndDelete(id).exec();
    if (floor) {
      await this.auditService.record({
        action: 'floor.deleted',
        actorUserId,
        branchId: floor.branchId,
        entityId: String(floor._id),
        entityType: 'floor',
        tenantId: floor.tenantId,
      });
      await this.realtimePublisher.publishRealtimeEvent(`branch:${floor.branchId}`, 'floor.changed', {
        branchId: floor.branchId,
        changeType: 'deleted',
        floorId: String(floor._id),
      });
    }
    return { success: true };
  }
}
