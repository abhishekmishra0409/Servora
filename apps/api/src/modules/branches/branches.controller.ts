import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@restaurent/shared';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StaffJwtGuard } from '../../common/guards/staff-jwt.guard';
import { BranchesService } from './branches.service';
import { UpdateBranchDto } from './dto';

@Controller('branches')
@UseGuards(StaffJwtGuard, RolesGuard)
@Roles(UserRole.Owner, UserRole.Manager)
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  list(@Query('tenantId') tenantId: string): Promise<unknown[]> {
    return this.branchesService.list(tenantId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBranchDto): Promise<unknown> {
    return this.branchesService.update(id, dto);
  }
}
