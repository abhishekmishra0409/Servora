import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Branch } from '../../database/schemas/branch.schema';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { RealtimePublisher } from '../../infrastructure/realtime/realtime-publisher.service';
import { Membership } from '../../database/schemas/membership.schema';
import { EntitlementsService } from '../../infrastructure/entitlements/entitlements.service';
import { CreateBranchDto, UpdateBranchDto } from './dto';

@Injectable()
export class BranchesService {
  constructor(
    @InjectModel(Branch.name) private readonly branchModel: Model<Branch>,
    @InjectModel(Membership.name) private readonly membershipModel: Model<Membership>,
    private readonly entitlements: EntitlementsService,
    private readonly auditService: AuditService,
    private readonly realtimePublisher: RealtimePublisher,
  ) {}

  async list(tenantId: string): Promise<Branch[]> {
    // Documents created before `status` existed have no field, so match those too.
    return this.branchModel
      .find({ status: { $ne: 'archived' }, tenantId })
      .sort({ name: 1 })
      .lean()
      .exec();
  }

  async create(dto: CreateBranchDto, actor: { role: string; sub: string }): Promise<Branch> {
    await this.entitlements.assertFeature(dto.tenantId, 'multi_outlet');
    await this.entitlements.assertCanCreate(dto.tenantId, 'branches');

    const slug = await this.uniqueSlug(dto.tenantId, slugify(dto.name));

    const branch = await this.branchModel.create({
      ...(dto.address ? { address: dto.address } : {}),
      ...(dto.hours ? { hours: dto.hours } : {}),
      ...(dto.serviceMode ? { serviceMode: dto.serviceMode } : {}),
      name: dto.name.trim(),
      slug,
      status: 'active',
      tenantId: dto.tenantId,
    });

    // Give the creator a membership on the new outlet, or they would be unable
    // to open the thing they just made — assertBranchAccess is membership-based.
    await this.membershipModel.updateOne(
      { branchId: String(branch._id), tenantId: dto.tenantId, userId: actor.sub },
      { $setOnInsert: { role: actor.role } },
      { upsert: true },
    );

    this.entitlements.invalidate(dto.tenantId);
    await this.auditService.record({
      action: 'branch.created',
      actorUserId: actor.sub,
      branchId: String(branch._id),
      entityId: String(branch._id),
      entityType: 'branch',
      tenantId: dto.tenantId,
    });

    return branch;
  }

  async archive(id: string, actorUserId: string): Promise<{ success: boolean }> {
    const branch = await this.branchModel.findById(id).exec();

    if (!branch) {
      throw new NotFoundException('Outlet not found');
    }

    const remaining = await this.branchModel
      .countDocuments({ _id: { $ne: branch._id }, status: { $ne: 'archived' }, tenantId: branch.tenantId })
      .exec();

    if (remaining === 0) {
      throw new ConflictException('A restaurant must keep at least one active outlet.');
    }

    branch.status = 'archived';
    await branch.save();
    this.entitlements.invalidate(branch.tenantId);
    await this.auditService.record({
      action: 'branch.archived',
      actorUserId,
      branchId: String(branch._id),
      entityId: String(branch._id),
      entityType: 'branch',
      tenantId: branch.tenantId,
    });

    return { success: true };
  }

  private async uniqueSlug(tenantId: string, base: string): Promise<string> {
    if (!base) {
      throw new BadRequestException('Outlet name must contain letters or numbers.');
    }

    // `main` is taken by the branch super-admin creates with every tenant.
    for (let suffix = 0; suffix < 50; suffix += 1) {
      const candidate = suffix === 0 ? base : `${base}-${suffix + 1}`;
      const clash = await this.branchModel.exists({ slug: candidate, tenantId }).exec();

      if (!clash) {
        return candidate;
      }
    }

    throw new ConflictException('Too many outlets with a similar name.');
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

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
