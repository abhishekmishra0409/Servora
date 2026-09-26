import { Module } from '@nestjs/common';

import { RolesModule } from '../roles/roles.module';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';

@Module({
  imports: [RolesModule],
  controllers: [StaffController],
  providers: [StaffService],
})
export class StaffModule {}
