import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import type { StaffJwtPayload, StaffSession } from '@restaurent/shared';
import { isValidObjectId, Model } from 'mongoose';

import { hashValue, matchesHash } from '../../common/utils/hash';
import { Membership } from '../../database/schemas/membership.schema';
import { User } from '../../database/schemas/user.schema';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { LoginDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Membership.name) private readonly membershipModel: Model<Membership>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async login(dto: LoginDto): Promise<StaffSession> {
    const user = await this.userModel.findOne({ email: dto.email.toLowerCase(), active: true }).exec();

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const validPassword = await matchesHash(dto.password, user.passwordHash);

    if (!validPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const membership = await this.membershipModel
      .findOne({
        userId: String(user._id),
        ...(dto.branchId ? { branchId: dto.branchId } : {}),
      })
      .exec();

    if (!membership) {
      throw new UnauthorizedException('Membership not found');
    }

    const payload: StaffJwtPayload = {
      email: user.email,
      role: membership.role,
      sub: String(user._id),
      tenantId: membership.tenantId,
      type: 'staff',
      ...(membership.branchId ? { branchId: membership.branchId } : {}),
    };
    const accessOptions = {
      expiresIn: this.configService.getOrThrow<string>('auth.accessTtl'),
      secret: this.configService.getOrThrow<string>('auth.accessSecret'),
    } as any;
    const refreshOptions = {
      expiresIn: this.configService.getOrThrow<string>('auth.refreshTtl'),
      secret: this.configService.getOrThrow<string>('auth.refreshSecret'),
    } as any;

    const accessToken = await this.jwtService.signAsync(
      { ...payload } as Record<string, unknown>,
      accessOptions,
    );

    const refreshToken = await this.jwtService.signAsync(
      { ...payload } as Record<string, unknown>,
      refreshOptions,
    );

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

    const user = await this.userModel.findById(payload.sub).exec();

    if (!user?.refreshTokenHash) {
      throw new UnauthorizedException('Refresh token not available');
    }

    let valid = false;

    try {
      valid = await matchesHash(refreshToken, user.refreshTokenHash);
    } catch {
      valid = false;
    }

    if (!valid) {
      throw new UnauthorizedException('Refresh token mismatch');
    }

    const { exp: _exp, iat: _iat, nbf: _nbf, ...nextPayload } = payload as StaffJwtPayload & {
      exp?: number;
      iat?: number;
      nbf?: number;
    };
    const accessOptions = {
      expiresIn: this.configService.getOrThrow<string>('auth.accessTtl'),
      secret: this.configService.getOrThrow<string>('auth.accessSecret'),
    } as any;
    const refreshOptions = {
      expiresIn: this.configService.getOrThrow<string>('auth.refreshTtl'),
      secret: this.configService.getOrThrow<string>('auth.refreshSecret'),
    } as any;

    const accessToken = await this.jwtService.signAsync(
      { ...nextPayload } as Record<string, unknown>,
      accessOptions,
    );

    const nextRefreshToken = await this.jwtService.signAsync(
      { ...nextPayload } as Record<string, unknown>,
      refreshOptions,
    );

    user.refreshTokenHash = await hashValue(nextRefreshToken);
    await user.save();

    return {
      accessToken,
      refreshToken: nextRefreshToken,
    };
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
}
