import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  expandPermissions,
  isBuiltinRoleKey,
  isPlatformRoleKey,
  permissionsForBuiltinRole,
} from '@restaurent/shared';
import { Model } from 'mongoose';

import { Membership } from '../../database/schemas/membership.schema';
import { Role } from '../../database/schemas/role.schema';

export interface EffectiveGrant {
  branchId?: string;
  permissions: ReadonlySet<string>;
  roleKey: string;
}

interface CacheEntry {
  expiresAt: number;
  value: ReadonlySet<string>;
}

/** Short enough that a revoked permission dies quickly, long enough to absorb a page load. */
const CACHE_TTL_MS = 30_000;
const CACHE_MAX_ENTRIES = 10_000;

/**
 * Resolves the permissions a user actually holds.
 *
 * Permissions are read from the database per request rather than carried in the
 * JWT. A token holds a single `branchId`, but a request's effective branch is
 * data-dependent (confirming an order derives the branch from the order), so a
 * token claim cannot express "manager at one outlet, waiter at another". Doing
 * it here also means an edited role takes effect immediately instead of
 * surviving until every outstanding token expires.
 *
 * The cost is near zero: `AccessService` already loads the membership on every
 * CMS request, so this consolidates a query rather than adding one.
 */
@Injectable()
export class PermissionResolverService {
  private readonly logger = new Logger(PermissionResolverService.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    @InjectModel(Membership.name) private readonly membershipModel: Model<Membership>,
    @InjectModel(Role.name) private readonly roleModel: Model<Role>,
  ) {}

  /**
   * Permissions for a specific branch — the authoritative check. Returns null
   * when the user holds no membership covering that branch.
   */
  async resolveForBranch(
    userId: string,
    tenantId: string,
    branchId: string,
  ): Promise<EffectiveGrant | null> {
    const membership =
      (await this.membershipModel.findOne({ branchId, tenantId, userId }).lean().exec()) ??
      // A membership with no branch is tenant-wide (owners, platform staff).
      // `branchId: null` matches both an explicit null and a missing field.
      (await this.membershipModel
        .findOne({ branchId: { $in: [null] }, tenantId, userId })
        .lean()
        .exec());

    if (!membership) {
      return null;
    }

    return {
      ...(membership.branchId ? { branchId: String(membership.branchId) } : {}),
      permissions: await this.permissionsForRole(tenantId, membership.role),
      roleKey: membership.role,
    };
  }

  /**
   * Union of permissions across every membership the user holds in the tenant.
   *
   * Used by the guard as a cheap "could this person do this anywhere?" filter
   * and by `/auth/me` to drive the CMS nav. It is deliberately broader than
   * `resolveForBranch` — the per-branch check in AccessService is what actually
   * authorises the record being touched.
   */
  async resolveTenantWide(userId: string, tenantId: string): Promise<ReadonlySet<string>> {
    const cacheKey = `${userId}:${tenantId}`;
    const cached = this.readCache(cacheKey);

    if (cached) {
      return cached;
    }

    const memberships = await this.membershipModel.find({ tenantId, userId }).lean().exec();
    const union = new Set<string>();

    for (const membership of memberships) {
      for (const permission of await this.permissionsForRole(tenantId, membership.role)) {
        union.add(permission);
      }
    }

    this.writeCache(cacheKey, union);
    return union;
  }

  async permissionsForRole(tenantId: string, roleKey: string): Promise<ReadonlySet<string>> {
    if (isPlatformRoleKey(roleKey) || isBuiltinRoleKey(roleKey)) {
      return expandPermissions(permissionsForBuiltinRole(roleKey));
    }

    const cacheKey = `role:${tenantId}:${roleKey}`;
    const cached = this.readCache(cacheKey);

    if (cached) {
      return cached;
    }

    const role = await this.roleModel.findOne({ active: true, key: roleKey, tenantId }).lean().exec();

    if (!role) {
      // Fail closed. A membership pointing at a deleted or deactivated role
      // grants nothing — but say so loudly, because the symptom (user can log
      // in and do nothing) is otherwise hard to trace.
      this.logger.warn(`Unresolvable role key "${roleKey}" for tenant ${tenantId}; granting nothing.`);
      return new Set<string>();
    }

    const permissions = expandPermissions(role.permissions ?? []);
    this.writeCache(cacheKey, permissions);
    return permissions;
  }

  invalidateUser(userId: string, tenantId: string): void {
    this.cache.delete(`${userId}:${tenantId}`);
  }

  /** Called whenever a role's permissions change, so holders see it at once. */
  invalidateTenant(tenantId: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(tenantId)) {
        this.cache.delete(key);
      }
    }
  }

  private readCache(key: string): ReadonlySet<string> | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  private writeCache(key: string, value: ReadonlySet<string>): void {
    if (this.cache.size >= CACHE_MAX_ENTRIES) {
      // Cheap eviction: drop the oldest insertion. Map preserves insert order.
      const oldest = this.cache.keys().next().value;
      if (oldest) {
        this.cache.delete(oldest);
      }
    }

    this.cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
  }
}
