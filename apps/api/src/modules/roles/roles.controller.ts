import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { StaffJwtPayload } from '@restaurent/shared';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { StaffJwtGuard } from '../../common/guards/staff-jwt.guard';
import { AccessService } from '../../infrastructure/access/access.service';
import { CreateRoleDto, UpdateRoleDto } from './dto';
import { RolesService } from './roles.service';

@Controller('cms/roles')
@UseGuards(StaffJwtGuard, PermissionsGuard)
export class RolesController {
  constructor(
    private readonly accessService: AccessService,
    private readonly rolesService: RolesService,
  ) {}

  /** The screen/action grid the builder renders. */
  @Get('registry')
  @RequirePermissions('roles:view')
  registry(): unknown {
    return this.rolesService.registry();
  }

  @Get()
  @RequirePermissions('roles:view')
  async list(@Query('tenantId') tenantId: string, @CurrentUser() user: StaffJwtPayload): Promise<unknown[]> {
    await this.accessService.assertTenantAccess(user, tenantId);
    return this.rolesService.list(tenantId);
  }

  @Post()
  @RequirePermissions('roles:add')
  async create(@Body() dto: CreateRoleDto, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    await this.accessService.assertTenantAccess(user, dto.tenantId);
    return this.rolesService.create(dto, user);
  }

  @Patch(':id')
  @RequirePermissions('roles:edit')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: StaffJwtPayload,
  ): Promise<unknown> {
    return this.rolesService.update(id, dto, user);
  }

  @Delete(':id')
  @RequirePermissions('roles:delete')
  remove(@Param('id') id: string, @CurrentUser() user: StaffJwtPayload): Promise<{ success: boolean }> {
    return this.rolesService.remove(id, user);
  }
}
