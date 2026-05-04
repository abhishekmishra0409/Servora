import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import type { StaffJwtPayload } from '@restaurent/shared';
import { UserRole } from '@restaurent/shared';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StaffJwtGuard } from '../../common/guards/staff-jwt.guard';
import { AccessService } from '../../infrastructure/access/access.service';
import { BranchesService } from './branches.service';
import { UpdateBranchDto } from './dto';

@Controller('branches')
@UseGuards(StaffJwtGuard, RolesGuard)
@Roles(UserRole.Owner, UserRole.Manager)
export class BranchesController {
  constructor(
    private readonly accessService: AccessService,
    private readonly branchesService: BranchesService,
  ) {}

  @Get()
  async list(@Query('tenantId') tenantId: string, @CurrentUser() user: StaffJwtPayload): Promise<unknown[]> {
    await this.accessService.assertTenantAccess(user, tenantId);
    return this.branchesService.list(tenantId);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateBranchDto, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    await this.accessService.assertBranchRecordAccess(user, id);
    return this.branchesService.update(id, dto, user.sub);
  }
}
