import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Membership } from '../../database/schemas/membership.schema';
import { User } from '../../database/schemas/user.schema';
import { hashValue } from '../../common/utils/hash';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { CreateStaffDto, UpdateStaffDto } from './dto';

@Injectable()
export class StaffService {
  constructor(
    @InjectModel(Membership.name) private readonly membershipModel: Model<Membership>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly auditService: AuditService,
  ) {}

  async list(branchId: string): Promise<unknown[]> {
    const memberships = await this.membershipModel.find({ branchId }).sort({ role: 1 }).lean().exec();
    const userIds = memberships.map((membership) => String(membership.userId));
    const users = await this.userModel.find({ _id: { $in: userIds } }).lean<Record<string, any>[]>().exec();
    const userMap = new Map(users.map((user) => [String(user._id), user]));

    return memberships.map((membership) => {
      const user = userMap.get(String(membership.userId));

      return {
        active: user?.active ?? false,
        branchId: membership.branchId,
        email: user?.email ?? '',
        id: String(membership._id),
        lastActive: user?.updatedAt,
        name: user?.name ?? 'Unknown staff',
        role: membership.role,
        tenantId: membership.tenantId,
        userId: membership.userId,
      };
    });
  }

  async create(dto: CreateStaffDto, actorUserId?: string): Promise<unknown> {
    const user = await this.userModel.findOneAndUpdate(
      { email: dto.email.toLowerCase() },
      {
        $set: {
          active: true,
          email: dto.email.toLowerCase(),
          name: dto.name,
          passwordHash: await hashValue(dto.password),
        },
      },
      { returnDocument: 'after', upsert: true },
    );

    const membership = await this.membershipModel.findOneAndUpdate(
      { branchId: dto.branchId, tenantId: dto.tenantId, userId: String(user._id) },
      { $set: { role: dto.role } },
      { returnDocument: 'after', upsert: true },
    );

    await this.auditService.record({
      action: 'staff.created',
      actorUserId,
      branchId: membership.branchId,
      entityId: String(user._id),
      entityType: 'user',
      payload: { role: membership.role },
      tenantId: membership.tenantId,
    });

    return {
      active: user.active,
      branchId: membership.branchId,
      email: user.email,
      id: String(membership._id),
      name: user.name,
      role: membership.role,
      tenantId: membership.tenantId,
      userId: String(user._id),
    };
  }

  async update(id: string, dto: UpdateStaffDto, actorUserId?: string): Promise<unknown> {
    const membership = await this.membershipModel.findById(id).exec();
    if (!membership) {
      throw new NotFoundException('Staff membership not found');
    }

    if (dto.role) {
      membership.role = dto.role;
      await membership.save();
    }

    const user = await this.userModel.findById(membership.userId).exec();
    if (!user) {
      throw new NotFoundException('Staff user not found');
    }

    if (dto.name) user.name = dto.name;
    if (typeof dto.active === 'boolean') user.active = dto.active;
    await user.save();

    await this.auditService.record({
      action: 'staff.updated',
      actorUserId,
      branchId: membership.branchId,
      entityId: String(user._id),
      entityType: 'user',
      payload: { role: membership.role },
      tenantId: membership.tenantId,
    });

    return {
      active: user.active,
      branchId: membership.branchId,
      email: user.email,
      id: String(membership._id),
      name: user.name,
      role: membership.role,
      tenantId: membership.tenantId,
      userId: String(user._id),
    };
  }

  async delete(id: string, actorUserId?: string): Promise<{ success: boolean }> {
    const membership = await this.membershipModel.findByIdAndDelete(id).exec();
    if (membership) {
      await this.auditService.record({
        action: 'staff.deleted',
        actorUserId,
        branchId: membership.branchId,
        entityId: membership.userId,
        entityType: 'user',
        tenantId: membership.tenantId,
      });
    }
    return { success: true };
  }
}
