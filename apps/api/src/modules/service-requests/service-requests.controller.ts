import { Body, Controller, Get, Patch, Param, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@restaurent/shared';
import type { GuestJwtPayload, StaffJwtPayload } from '@restaurent/shared';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { GuestJwtGuard } from '../../common/guards/guest-jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StaffJwtGuard } from '../../common/guards/staff-jwt.guard';
import { AccessService } from '../../infrastructure/access/access.service';
import { CreateServiceRequestDto } from './dto';
import { ServiceRequestsService } from './service-requests.service';

@Controller('service-requests')
export class ServiceRequestsController {
  constructor(
    private readonly accessService: AccessService,
    private readonly serviceRequestsService: ServiceRequestsService,
  ) {}

  @UseGuards(GuestJwtGuard)
  @Post()
  create(
    @CurrentUser() user: GuestJwtPayload,
    @Body() dto: CreateServiceRequestDto,
  ): Promise<unknown> {
    return this.serviceRequestsService.create(user, dto);
  }

  @UseGuards(StaffJwtGuard, RolesGuard)
  @Roles(UserRole.Owner, UserRole.Manager, UserRole.Waiter)
  @Get()
  async list(@Query('branchId') branchId: string, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    await this.accessService.assertBranchAccess(user, branchId);
    return this.serviceRequestsService.list(branchId);
  }

  @UseGuards(StaffJwtGuard, RolesGuard)
  @Roles(UserRole.Owner, UserRole.Manager, UserRole.Waiter)
  @Patch(':id/resolve')
  resolve(@Param('id') id: string, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    return this.serviceRequestsService.resolve(id, user.sub);
  }
}
