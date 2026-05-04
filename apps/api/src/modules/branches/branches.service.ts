import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Branch } from '../../database/schemas/branch.schema';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { RealtimePublisher } from '../../infrastructure/realtime/realtime-publisher.service';
import { UpdateBranchDto } from './dto';

@Injectable()
export class BranchesService {
  constructor(
    @InjectModel(Branch.name) private readonly branchModel: Model<Branch>,
    private readonly auditService: AuditService,
    private readonly realtimePublisher: RealtimePublisher,
  ) {}

  async list(tenantId: string): Promise<Branch[]> {
    return this.branchModel.find({ tenantId }).sort({ name: 1 }).lean().exec();
  }

  async update(id: string, dto: UpdateBranchDto, actorUserId?: string): Promise<Branch> {
    const branch = await this.branchModel.findByIdAndUpdate(id, dto, { returnDocument: 'after' }).exec();
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
    await Promise.all([
      this.auditService.record({
        action: 'branch.updated',
        actorUserId,
        branchId: String(branch._id),
        entityId: String(branch._id),
        entityType: 'branch',
        tenantId: branch.tenantId,
      }),
      this.realtimePublisher.publishRealtimeEvent(`branch:${String(branch._id)}`, 'branch.updated', {
        branchId: String(branch._id),
        serviceMode: branch.serviceMode,
      }),
    ]);
    return branch;
  }
}
