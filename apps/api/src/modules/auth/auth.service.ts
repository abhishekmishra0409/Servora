import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { isPlatformRoleKey, UserRole, type StaffJwtPayload, type StaffSession } from '@restaurent/shared';
import { isValidObjectId, Model } from 'mongoose';

import { hashValue, matchesHash } from '../../common/utils/hash';
import { Branch } from '../../database/schemas/branch.schema';
import { PermissionResolverService } from '../../infrastructure/access/permission-resolver.service';
import { EntitlementsService } from '../../infrastructure/entitlements/entitlements.service';
import { Membership, MembershipDocument } from '../../database/schemas/membership.schema';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { ChangePasswordDto, LoginDto } from './dto';

const platformRoles: string[] = [UserRole.SuperAdmin, UserRole.PlatformAdmin];

// Used only to break ties when a user holds several memberships and the client
// did not say which branch it wants. Higher wins.
const rolePriority: Record<string, number> = {
  [UserRole.SuperAdmin]: 70,
  [UserRole.PlatformAdmin]: 60,
  [UserRole.Owner]: 50,
  [UserRole.Manager]: 40,
  [UserRole.Cashier]: 30,
  [UserRole.Kitchen]: 20,
  [UserRole.Waiter]: 10,
  [UserRole.Customer]: 0,
};

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Membership.name) private readonly membershipModel: Model<Membership>,
    @InjectModel(Branch.name) private readonly branchModel: Model<Branch>,
    private readonly permissionResolver: PermissionResolverService,
    private readonly entitlements: EntitlementsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async login(dto: LoginDto): Promise<StaffSession> {
    const user = await this.userModel
      .findOne({ email: dto.email.toLowerCase(), active: true })
      .select('+passwordHash +refreshTokenHash')
      .exec();

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const validPassword = await matchesHash(dto.password, user.passwordHash);

    if (!validPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const membership = await this.selectMembership(String(user._id), dto.branchId);

    if (!membership) {
      throw new UnauthorizedException('Membership not found');
    }

    const payload = this.buildPayload(user, membership);
    const { accessToken, refreshToken } = await this.issueTokens(payload);

    user.refreshTokenHash = await hashValue(refreshToken);
    await user.save();
    await this.auditService.record({
      action: 'staff.login',
      actorUserId: String(user._id),
      ...(membership.branchId ? { branchId: membership.branchId } : {}),
      entityId: String(user._id),
      entityType: 'user',
      tenantId: membership.tenantId,
    });

    return {
      accessToken,
      ...(membership.branchId ? { branchId: membership.branchId } : {}),
      permissions: [
        ...(await this.permissionResolver.resolveTenantWide(String(user._id), membership.tenantId)),
      ],
      refreshToken,
      role: membership.role,
      tenantId: membership.tenantId,
      userId: String(user._id),
    };
  }

  async refresh(refreshToken: string): Promise<Pick<StaffSession, 'accessToken' | 'refreshToken'>> {
    let payload: StaffJwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<StaffJwtPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>('auth.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'staff' || !isValidObjectId(payload.sub)) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userModel.findById(payload.sub).select('+refreshTokenHash').exec();

    if (!user?.refreshTokenHash) {
      throw new UnauthorizedException('Refresh token not available');
    }

    const valid = await matchesHash(refreshToken, user.refreshTokenHash).catch(() => false);

    if (!valid) {
      throw new UnauthorizedException('Refresh token mismatch');
    }

    // Re-derive the session from the database rather than re-signing the old
    // claims. The previous implementation copied the decoded payload forward on
    // every refresh, so a deactivated account, a deleted membership, or a
    // changed role kept working indefinitely for as long as the client kept
    // refreshing.
    if (!user.active) {
      throw new UnauthorizedException('Account is disabled');
    }

    const membership = await this.selectMembership(String(user._id), payload.branchId);

    if (!membership) {
      throw new UnauthorizedException('Membership not found');
    }

    const nextPayload = this.buildPayload(user, membership);
    const tokens = await this.issueTokens(nextPayload);

    user.refreshTokenHash = await hashValue(tokens.refreshToken);
    await user.save();

    return tokens;
  }

  async logout(userId: string): Promise<{ success: boolean }> {
    const user = await this.userModel.findByIdAndUpdate(userId, { $unset: { refreshTokenHash: 1 } }).exec();
    const membership = await this.membershipModel.findOne({ userId }).lean().exec();
    if (user && membership) {
      await this.auditService.record({
        action: 'staff.logout',
        actorUserId: userId,
        ...(membership.branchId ? { branchId: membership.branchId } : {}),
        entityId: userId,
        entityType: 'user',
        tenantId: membership.tenantId,
      });
    }
    return { success: true };
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ success: boolean }> {
    const user = await this.userModel.findById(userId).select('+passwordHash +refreshTokenHash').exec();

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const validPassword = await matchesHash(dto.currentPassword, user.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.passwordHash = await hashValue(dto.newPassword);
    user.set('refreshTokenHash', undefined);
    await user.save();

    const membership = await this.membershipModel.findOne({ userId }).lean().exec();
    if (membership) {
      await this.auditService.record({
        action: 'staff.password_changed',
        actorUserId: userId,
        ...(membership.branchId ? { branchId: membership.branchId } : {}),
        entityId: userId,
        entityType: 'user',
        tenantId: membership.tenantId,
      });
    }

    return { success: true };
  }

  /**
   * Everything the CMS needs to render itself for the current user: effective
   * permissions (which drive the nav and per-button gating), the outlets this
   * person can work in, and the tenant's plan usage.
   */
  async getSessionContext(user: StaffJwtPayload): Promise<unknown> {
    const [account, memberships, permissions] = await Promise.all([
      this.getMe(user.sub),
      this.membershipModel.find({ tenantId: user.tenantId, userId: user.sub }).lean().exec(),
      this.permissionResolver.resolveTenantWide(user.sub, user.tenantId),
    ]);

    const branchIds = memberships.map((membership) => membership.branchId).filter(Boolean);
    const branches = await this.branchModel
      .find({ _id: { $in: branchIds } })
      .select('name slug')
      .lean()
      .exec();
    const branchName = new Map(branches.map((branch) => [String(branch._id), branch.name]));

    // Platform staff have no tenant plan of their own.
    const entitlements = isPlatformRoleKey(user.role)
      ? null
      : await this.entitlements.getEntitlementsWithUsage(user.tenantId);

    return {
      branches: memberships
        .filter((membership) => membership.branchId)
        .map((membership) => ({
          branchId: String(membership.branchId),
          name: branchName.get(String(membership.branchId)) ?? 'Outlet',
          roleKey: membership.role,
        })),
      entitlements,
      permissions: [...permissions],
      role: user.role,
      tenantId: user.tenantId,
      user: account,
      ...(user.branchId ? { branchId: user.branchId } : {}),
    };
  }

  /**
   * Re-issues a session for a different outlet. Without this, a user holding
   * roles at two outlets is stuck in whichever membership login picked.
   */
  async switchBranch(user: StaffJwtPayload, branchId: string): Promise<StaffSession> {
    const membership = await this.membershipModel
      .findOne({ branchId, tenantId: user.tenantId, userId: user.sub })
      .exec();

    if (!membership) {
      throw new UnauthorizedException('You do not have access to that outlet');
    }

    const account = await this.userModel.findById(user.sub).select('+refreshTokenHash').exec();

    if (!account?.active) {
      throw new UnauthorizedException('Account is disabled');
    }

    const payload = this.buildPayload(account, membership);
    const tokens = await this.issueTokens(payload);

    account.refreshTokenHash = await hashValue(tokens.refreshToken);
    await account.save();

    return {
      accessToken: tokens.accessToken,
      branchId: String(membership.branchId),
      permissions: [
        ...(await this.permissionResolver.resolveForBranch(user.sub, user.tenantId, branchId))?.permissions ?? [],
      ],
      refreshToken: tokens.refreshToken,
      role: membership.role,
      tenantId: membership.tenantId,
      userId: String(account._id),
    };
  }

  async getMe(userId: string): Promise<{ email: string; id: string; name: string }> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      email: user.email,
      id: String(user._id),
      name: user.name,
    };
  }

  /**
   * Deterministically pick the membership a session runs as.
   *
   * This used to be a bare `findOne` with no sort, so a user holding
   * memberships in several branches was handed an arbitrary one — and
   * therefore an arbitrary role. Selection is now: an exact branch match
   * first, then (for platform staff only) any membership, breaking ties by
   * role rank and then by age, so the same user always lands on the same
   * session.
   */
  private async selectMembership(
    userId: string,
    branchId?: string,
  ): Promise<MembershipDocument | null> {
    const memberships = await this.membershipModel
      .find({ userId })
      .sort({ createdAt: 1, _id: 1 })
      .exec();

    if (memberships.length === 0) {
      return null;
    }

    if (branchId) {
      const exact = memberships.filter((membership) => String(membership.branchId ?? '') === branchId);

      if (exact.length > 0) {
        return this.mostPrivileged(exact);
      }

      // Platform staff are not bound to a branch, so they may assume the branch
      // they asked for. Everyone else is refused rather than silently falling
      // back to a different branch's role.
      const platform = memberships.filter((membership) => platformRoles.includes(membership.role));

      return platform.length > 0 ? this.mostPrivileged(platform) : null;
    }

    return this.mostPrivileged(memberships);
  }

  private mostPrivileged(memberships: MembershipDocument[]): MembershipDocument {
    // `memberships` arrives sorted oldest-first, and reduce keeps the earlier
    // entry on a tie, so equal-rank memberships resolve to the oldest.
    return memberships.reduce((best, candidate) =>
      (rolePriority[candidate.role] ?? 0) > (rolePriority[best.role] ?? 0) ? candidate : best,
    );
  }

  private buildPayload(user: UserDocument, membership: MembershipDocument): StaffJwtPayload {
    return {
      email: user.email,
      role: membership.role,
      sub: String(user._id),
      tenantId: membership.tenantId,
      type: 'staff',
      ...(membership.branchId ? { branchId: membership.branchId } : {}),
    };
  }

  private async issueTokens(
    payload: StaffJwtPayload,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessOptions = {
      expiresIn: this.configService.getOrThrow<string>('auth.accessTtl'),
      secret: this.configService.getOrThrow<string>('auth.accessSecret'),
    } as any;
    const refreshOptions = {
      expiresIn: this.configService.getOrThrow<string>('auth.refreshTtl'),
      secret: this.configService.getOrThrow<string>('auth.refreshSecret'),
    } as any;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync({ ...payload } as Record<string, unknown>, accessOptions),
      this.jwtService.signAsync({ ...payload } as Record<string, unknown>, refreshOptions),
    ]);

    return { accessToken, refreshToken };
  }
}
