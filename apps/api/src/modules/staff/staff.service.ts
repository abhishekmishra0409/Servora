import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { UserRole, type StaffJwtPayload } from '@restaurent/shared';
import { Model } from 'mongoose';

import { Membership } from '../../database/schemas/membership.schema';
import { User } from '../../database/schemas/user.schema';
import { hashValue } from '../../common/utils/hash';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { EntitlementsService } from '../../infrastructure/entitlements/entitlements.service';
import { PermissionResolverService } from '../../infrastructure/access/permission-resolver.service';
import { RolesService } from '../roles/roles.service';
import { CreateStaffDto, UpdateStaffDto } from './dto';

@Injectable()
export class StaffService {
  constructor(
    @InjectModel(Membership.name) private readonly membershipModel: Model<Membership>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly auditService: AuditService,
    private readonly entitlements: EntitlementsService,
    private readonly rolesService: RolesService,
    private readonly permissionResolver: PermissionResolverService,
  ) {}

  async list(branchId: string, tenantId: string, actor: StaffJwtPayload): Promise<unknown[]> {
    const memberships = await this.membershipModel
      .find({
        branchId,
        tenantId,
        ...(actor.role === UserRole.SuperAdmin ? {} : { role: { $nin: this.platformRoles() } }),
      })
      .sort({ role: 1 })
      .lean()
      .exec();
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
    await this.assertRoleExists(dto.tenantId, dto.role);

    const normalizedEmail = dto.email.toLowerCase();
    const existingUser = await this.userModel.findOne({ email: normalizedEmail }).select('_id').lean().exec();
    const existingMembership = existingUser
      ? await this.membershipModel
          .exists({ branchId: dto.branchId, tenantId: dto.tenantId, userId: String(existingUser._id) })
          .exec()
      : null;
    if (!existingMembership) {
      await this.entitlements.assertCanCreate(dto.tenantId, 'employees');
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
    this.assertCanManageMembership(membership, actor);

    if (dto.role) {
      this.assertCanAssignRole(dto.role, actor.role);
      await this.assertRoleExists(membership.tenantId, dto.role);
      membership.role = dto.role;
      await membership.save();
      this.permissionResolver.invalidateUser(membership.userId, membership.tenantId);
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

  async delete(id: string, actor: StaffJwtPayload): Promise<{ success: boolean }> {
    const membership = await this.membershipModel.findById(id).exec();
    if (membership) {
      this.assertCanManageMembership(membership, actor);
      await membership.deleteOne();
      await this.auditService.record({
        action: 'staff.deleted',
        actorUserId: actor.sub,
        branchId: membership.branchId,
        entityId: membership.userId,
        entityType: 'user',
        tenantId: membership.tenantId,
      });
    }
    return { success: true };
  }

  private platformRoles(): string[] {
    return [UserRole.SuperAdmin, UserRole.PlatformAdmin];
  }

  private isPlatformRole(role: string): boolean {
    return this.platformRoles().includes(role);
  }

  private assertCanManageMembership(membership: Membership, actor: StaffJwtPayload): void {
    if (actor.role !== UserRole.SuperAdmin && this.isPlatformRole(membership.role)) {
      throw new ForbiddenException('Only a super admin can manage platform staff');
    }
  }

  private assertCanAssignRole(targetRole: string, actorRole: string): void {
    if (this.isPlatformRole(targetRole) && actorRole !== UserRole.SuperAdmin) {
      throw new ForbiddenException('Only a super admin can assign platform roles');
    }
  }

  /**
   * A membership may only reference a built-in role or one this tenant defined.
   * `Membership.role` is no longer a schema enum, so this is the validation.
   */
  private async assertRoleExists(tenantId: string, role: string): Promise<void> {
    if (this.isPlatformRole(role)) {
      return;
    }

    const assignable = await this.rolesService.assignableRoleKeys(tenantId);

    if (!assignable.has(role)) {
      throw new NotFoundException(`Unknown role "${role}" for this restaurant.`);
    }
  }
}
