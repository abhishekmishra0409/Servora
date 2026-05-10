import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { UserRole, type StaffJwtPayload } from '@restaurent/shared';
import { Model } from 'mongoose';

import { Membership } from '../../database/schemas/membership.schema';
import { User } from '../../database/schemas/user.schema';
import { hashValue } from '../../common/utils/hash';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { BillingService } from '../billing/billing.service';
import { CreateStaffDto, UpdateStaffDto } from './dto';

@Injectable()
export class StaffService {
  constructor(
    @InjectModel(Membership.name) private readonly membershipModel: Model<Membership>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly auditService: AuditService,
    private readonly billingService: BillingService,
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

  async create(dto: CreateStaffDto, actor: StaffJwtPayload): Promise<unknown> {
    this.assertCanAssignRole(dto.role, actor.role);

    const normalizedEmail = dto.email.toLowerCase();
    const existingUser = await this.userModel.findOne({ email: normalizedEmail }).select('_id').lean().exec();
    const existingMembership = existingUser
      ? await this.membershipModel
          .exists({ branchId: dto.branchId, tenantId: dto.tenantId, userId: String(existingUser._id) })
          .exec()
      : null;
    if (!existingMembership) {
      await this.assertEmployeeLimit(dto.tenantId);
    }

    const user = await this.userModel.findOneAndUpdate(
      { email: normalizedEmail },
      {
        $set: {
          active: true,
          email: normalizedEmail,
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
      actorUserId: actor.sub,
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

  async update(id: string, dto: UpdateStaffDto, actor: StaffJwtPayload): Promise<unknown> {
    const membership = await this.membershipModel.findById(id).exec();
    if (!membership) {
      throw new NotFoundException('Staff membership not found');
    }

    if (dto.role) {
      this.assertCanAssignRole(dto.role, actor.role);
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
      actorUserId: actor.sub,
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

  private assertCanAssignRole(targetRole: UserRole, actorRole: UserRole): void {
    const platformRoles = [UserRole.SuperAdmin, UserRole.PlatformAdmin];
    if (platformRoles.includes(targetRole) && actorRole !== UserRole.SuperAdmin) {
      throw new ForbiddenException('Only a super admin can assign platform roles');
    }
  }

  private async assertEmployeeLimit(tenantId: string): Promise<void> {
    const plan = await this.billingService.getTenantBillingPlan(tenantId);
    const employeeLimit = Number(plan?.employeeLimit ?? 0);
    if (!employeeLimit) {
      return;
    }

    const employeeCount = await this.membershipModel.countDocuments({ tenantId }).exec();
    if (employeeCount >= employeeLimit) {
      throw new ForbiddenException(`Your subscription allows up to ${employeeLimit} employee accounts.`);
    }
  }
}
