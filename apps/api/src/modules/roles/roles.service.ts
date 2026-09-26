import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  BUILTIN_ROLE_PERMISSIONS,
  expandPermissions,
  isBuiltinRoleKey,
  isPlatformRoleKey,
  isValidPermission,
  PLATFORM_ROLE_KEYS,
  SCREENS,
  TENANT_ASSIGNABLE_PERMISSIONS,
  UserRole,
  type StaffJwtPayload,
} from '@restaurent/shared';
import { Model, Types } from 'mongoose';

import { Membership } from '../../database/schemas/membership.schema';
import { Role } from '../../database/schemas/role.schema';
import { PermissionResolverService } from '../../infrastructure/access/permission-resolver.service';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { EntitlementsService } from '../../infrastructure/entitlements/entitlements.service';
import { CreateRoleDto, UpdateRoleDto } from './dto';

const TENANT_ASSIGNABLE = new Set(TENANT_ASSIGNABLE_PERMISSIONS);

/** Roles a tenant may duplicate. Platform roles are never offered. */
const TEMPLATE_ROLES = [
  UserRole.Owner,
  UserRole.Manager,
  UserRole.Waiter,
  UserRole.Kitchen,
  UserRole.Cashier,
] as const;

export interface RoleView {
  active: boolean;
  assignedCount: number;
  builtIn: boolean;
  description?: string;
  id: string;
  key: string;
  name: string;
  permissions: string[];
}

@Injectable()
export class RolesService {
  constructor(
    @InjectModel(Role.name) private readonly roleModel: Model<Role>,
    @InjectModel(Membership.name) private readonly membershipModel: Model<Membership>,
    private readonly permissionResolver: PermissionResolverService,
    private readonly entitlements: EntitlementsService,
    private readonly auditService: AuditService,
  ) {}

  /** The screen/action grid the role builder renders. */
  registry(): unknown {
    return { screens: SCREENS.filter((screen) => !screen.platformOnly) };
  }

  async list(tenantId: string): Promise<RoleView[]> {
    const [custom, counts] = await Promise.all([
      this.roleModel.find({ tenantId }).sort({ name: 1 }).lean().exec(),
      this.membershipModel.aggregate<{ _id: string; count: number }>([
        { $match: { tenantId: toObjectId(tenantId) } },
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),
    ]);

    const countByRole = new Map(counts.map((entry) => [entry._id, entry.count]));

    const builtIns: RoleView[] = TEMPLATE_ROLES.map((key) => ({
      active: true,
      assignedCount: countByRole.get(key) ?? 0,
      builtIn: true,
      description: 'Built-in role. Duplicate it to make an editable copy.',
      id: key,
      key,
      name: titleCase(key),
      permissions: [...(BUILTIN_ROLE_PERMISSIONS[key] ?? [])],
    }));

    const customViews: RoleView[] = custom.map((role) => ({
      active: role.active,
      assignedCount: countByRole.get(role.key) ?? 0,
      builtIn: false,
      ...(role.description ? { description: role.description } : {}),
      id: String(role._id),
      key: role.key,
      name: role.name,
      permissions: role.permissions ?? [],
    }));

    return [...builtIns, ...customViews];
  }

  async create(dto: CreateRoleDto, actor: StaffJwtPayload): Promise<RoleView> {
    await this.entitlements.assertFeature(dto.tenantId, 'custom_roles');
    await this.entitlements.assertCanCreate(dto.tenantId, 'customRoles');

    const permissions = await this.sanitizePermissions(dto.permissions, dto.tenantId, actor);
    const key = await this.uniqueKey(dto.tenantId, slugify(dto.name));

    const created = await this.roleModel.create({
      active: true,
      createdBy: actor.sub,
      ...(dto.derivedFrom ? { derivedFrom: dto.derivedFrom } : {}),
      ...(dto.description ? { description: dto.description } : {}),
      key,
      name: dto.name.trim(),
      permissions,
      tenantId: dto.tenantId,
      updatedBy: actor.sub,
    });

    this.permissionResolver.invalidateTenant(dto.tenantId);
    this.entitlements.invalidate(dto.tenantId);
    await this.auditService.record({
      action: 'role.created',
      actorUserId: actor.sub,
      entityId: String(created._id),
      entityType: 'role',
      payload: { key, permissions },
      tenantId: dto.tenantId,
    });

    return this.toView(created.toObject(), 0);
  }

  async update(id: string, dto: UpdateRoleDto, actor: StaffJwtPayload): Promise<RoleView> {
    const role = await this.roleModel.findById(id).exec();

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    await this.assertTenantOwnership(role.tenantId, actor);

    if (dto.permissions) {
      const next = await this.sanitizePermissions(dto.permissions, role.tenantId, actor);
      await this.assertNotSelfLockout(role, next, actor);
      role.permissions = next;
    }

    if (dto.name) {
      role.name = dto.name.trim();
    }

    if (dto.description !== undefined) {
      role.description = dto.description;
    }

    role.updatedBy = actor.sub;
    await role.save();

    this.permissionResolver.invalidateTenant(role.tenantId);
    await this.auditService.record({
      action: 'role.updated',
      actorUserId: actor.sub,
      entityId: String(role._id),
      entityType: 'role',
      payload: { key: role.key, permissions: role.permissions },
      tenantId: role.tenantId,
    });

    const assignedCount = await this.membershipModel
      .countDocuments({ role: role.key, tenantId: role.tenantId })
      .exec();

    return this.toView(role.toObject(), assignedCount);
  }

  async remove(id: string, actor: StaffJwtPayload): Promise<{ success: boolean }> {
    const role = await this.roleModel.findById(id).exec();

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    await this.assertTenantOwnership(role.tenantId, actor);

    // Refuse rather than cascade: a membership pointing at a deleted role
    // resolves to no permissions, which looks like a broken account.
    const assignedCount = await this.membershipModel
      .countDocuments({ role: role.key, tenantId: role.tenantId })
      .exec();

    if (assignedCount > 0) {
      throw new ConflictException(
        `${assignedCount} staff member(s) still use this role. Move them to another role first.`,
      );
    }

    await role.deleteOne();
    this.permissionResolver.invalidateTenant(role.tenantId);
    this.entitlements.invalidate(role.tenantId);
    await this.auditService.record({
      action: 'role.deleted',
      actorUserId: actor.sub,
      entityId: id,
      entityType: 'role',
      payload: { key: role.key },
      tenantId: role.tenantId,
    });

    return { success: true };
  }

  /** Every role key a membership in this tenant may legally reference. */
  async assignableRoleKeys(tenantId: string): Promise<Set<string>> {
    const custom = await this.roleModel.find({ active: true, tenantId }).select('key').lean().exec();

    return new Set([...TEMPLATE_ROLES, ...custom.map((role) => role.key)]);
  }

  private async sanitizePermissions(
    requested: string[],
    tenantId: string,
    actor: StaffJwtPayload,
  ): Promise<string[]> {
    const unknown = requested.filter((permission) => !isValidPermission(permission));

    if (unknown.length > 0) {
      throw new BadRequestException(`Unknown permission(s): ${unknown.join(', ')}`);
    }

    const platformOnly = requested.filter((permission) => !TENANT_ASSIGNABLE.has(permission));

    if (platformOnly.length > 0) {
      throw new ForbiddenException('Platform permissions cannot be granted to a tenant role.');
    }

    // Nobody may mint a role more powerful than themselves. For an owner this
    // is a no-op; it stops a delegated "HR manager" with roles:add from
    // escalating to billing or platform access.
    if (!isPlatformRoleKey(actor.role)) {
      const held = await this.permissionResolver.resolveTenantWide(actor.sub, tenantId);
      const beyond = requested.filter((permission) => !held.has(permission));

      if (beyond.length > 0) {
        throw new ForbiddenException(
          `You cannot grant permissions you do not hold: ${beyond.slice(0, 5).join(', ')}`,
        );
      }
    }

    return [...expandPermissions(requested)].sort();
  }

  /**
   * Stops an editor from removing their own ability to get back in. Editing a
   * role you currently hold must keep the role-management and settings screens.
   */
  private async assertNotSelfLockout(
    role: Role,
    nextPermissions: string[],
    actor: StaffJwtPayload,
  ): Promise<void> {
    const holdsThisRole = await this.membershipModel
      .exists({ role: role.key, tenantId: role.tenantId, userId: actor.sub })
      .exec();

    if (!holdsThisRole) {
      return;
    }

    const next = new Set(nextPermissions);
    const required = ['roles:view', 'roles:edit', 'staff:view'];
    const missing = required.filter((permission) => !next.has(permission));

    if (missing.length > 0) {
      throw new BadRequestException(
        'You are assigned this role, so it must keep Roles and Staff access or you would lock yourself out.',
      );
    }
  }

  private async assertTenantOwnership(tenantId: string, actor: StaffJwtPayload): Promise<void> {
    if (isPlatformRoleKey(actor.role)) {
      return;
    }

    if (String(tenantId) !== actor.tenantId) {
      throw new ForbiddenException('Role access denied');
    }
  }

  private async uniqueKey(tenantId: string, base: string): Promise<string> {
    if (!base) {
      throw new BadRequestException('Role name must contain letters or numbers.');
    }

    // Reserved: a custom role named "owner" or "super_admin" would collide with
    // the built-in templates and the platform-role checks.
    if (isBuiltinRoleKey(base) || PLATFORM_ROLE_KEYS.includes(base)) {
      throw new BadRequestException(`"${base}" is a built-in role name. Pick another.`);
    }

    for (let suffix = 0; suffix < 50; suffix += 1) {
      const candidate = suffix === 0 ? base : `${base}-${suffix + 1}`;
      const clash = await this.roleModel.exists({ key: candidate, tenantId }).exec();

      if (!clash) {
        return candidate;
      }
    }

    throw new ConflictException('Too many roles with a similar name.');
  }

  private toView(role: Role & { _id?: unknown }, assignedCount: number): RoleView {
    return {
      active: Boolean(role.active),
      assignedCount,
      builtIn: false,
      ...(role.description ? { description: String(role.description) } : {}),
      id: String(role._id),
      key: String(role.key),
      name: String(role.name),
      permissions: (role.permissions as string[]) ?? [],
    };
  }
}

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const titleCase = (value: string): string =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

/** Memberships store tenantId as an ObjectId, so an aggregate $match needs a cast. */
const toObjectId = (value: string): unknown =>
  Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : value;
