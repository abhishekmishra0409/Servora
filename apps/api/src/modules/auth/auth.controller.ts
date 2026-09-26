import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { StaffJwtGuard } from '../../common/guards/staff-jwt.guard';
import type { StaffJwtPayload, StaffSession } from '@restaurent/shared';
import { AuthService } from './auth.service';
import { ChangePasswordDto, LoginDto, RefreshDto, SwitchBranchDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Throttle credential endpoints hard to blunt brute-force / token-guessing.
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  login(@Body() dto: LoginDto): Promise<StaffSession> {
    return this.authService.login(dto);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('refresh')
  refresh(@Body() dto: RefreshDto): Promise<Pick<StaffSession, 'accessToken' | 'refreshToken'>> {
    return this.authService.refresh(dto.refreshToken);
  }

  @UseGuards(StaffJwtGuard)
  @Post('logout')
  logout(@CurrentUser() user: StaffJwtPayload): Promise<{ success: boolean }> {
    return this.authService.logout(user.sub);
  }

  @UseGuards(StaffJwtGuard)
  @Post('change-password')
  changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: StaffJwtPayload,
  ): Promise<{ success: boolean }> {
    return this.authService.changePassword(user.sub, dto);
  }

  @UseGuards(StaffJwtGuard)
  @Get('me')
  me(@CurrentUser() user: StaffJwtPayload): Promise<{ email: string; id: string; name: string }> {
    return this.authService.getMe(user.sub);
  }

  /** Drives the CMS nav, the outlet switcher, and the plan usage meters. */
  @UseGuards(StaffJwtGuard)
  @Get('session')
  session(@CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    return this.authService.getSessionContext(user);
  }

  @UseGuards(StaffJwtGuard)
  @Post('switch-branch')
  switchBranch(
    @Body() dto: SwitchBranchDto,
    @CurrentUser() user: StaffJwtPayload,
  ): Promise<StaffSession> {
    return this.authService.switchBranch(user, dto.branchId);
  }
}
