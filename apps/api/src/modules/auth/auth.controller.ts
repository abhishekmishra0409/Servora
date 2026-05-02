import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { StaffJwtGuard } from '../../common/guards/staff-jwt.guard';
import type { StaffJwtPayload, StaffSession } from '@restaurent/shared';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto): Promise<StaffSession> {
    return this.authService.login(dto);
  }

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
  @Get('me')
  me(@CurrentUser() user: StaffJwtPayload): Promise<{ email: string; id: string; name: string }> {
    return this.authService.getMe(user.sub);
  }
}

