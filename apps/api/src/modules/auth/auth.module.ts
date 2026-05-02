import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { GuestJwtGuard } from '../../common/guards/guest-jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StaffJwtGuard } from '../../common/guards/staff-jwt.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Global()
@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, StaffJwtGuard, GuestJwtGuard, RolesGuard],
  exports: [AuthService, JwtModule, StaffJwtGuard, GuestJwtGuard, RolesGuard],
})
export class AuthModule {}

