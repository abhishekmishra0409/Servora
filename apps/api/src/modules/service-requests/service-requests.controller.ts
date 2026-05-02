import { Body, Controller, Get, Patch, Param, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@restaurent/shared';
import type { GuestJwtPayload } from '@restaurent/shared';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { GuestJwtGuard } from '../../common/guards/guest-jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StaffJwtGuard } from '../../common/guards/staff-jwt.guard';
import { CreateServiceRequestDto } from './dto';
import { ServiceRequestsService } from './service-requests.service';

@Controller('service-requests')
export class ServiceRequestsController {
  constructor(private readonly serviceRequestsService: ServiceRequestsService) {}

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
  list(@Query('branchId') branchId: string): Promise<unknown> {
    return this.serviceRequestsService.list(branchId);
  }

  @UseGuards(StaffJwtGuard, RolesGuard)
  @Roles(UserRole.Owner, UserRole.Manager, UserRole.Waiter)
  @Patch(':id/resolve')
  resolve(@Param('id') id: string): Promise<unknown> {
    return this.serviceRequestsService.resolve(id);
  }
}
