import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@restaurent/shared';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StaffJwtGuard } from '../../common/guards/staff-jwt.guard';
import { MediaService } from './media.service';

@Controller('media')
@UseGuards(StaffJwtGuard, RolesGuard)
@Roles(UserRole.PlatformAdmin, UserRole.Owner, UserRole.Manager)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('sign-upload')
  signUpload(@Body('folder') folder?: string): ReturnType<MediaService['signUpload']> {
    return this.mediaService.signUpload(folder);
  }
}
