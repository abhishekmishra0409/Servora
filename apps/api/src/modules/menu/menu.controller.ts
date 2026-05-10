import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { StaffJwtPayload } from '@restaurent/shared';
import { UserRole } from '@restaurent/shared';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StaffJwtGuard } from '../../common/guards/staff-jwt.guard';
import { AccessService } from '../../infrastructure/access/access.service';
import {
  CreateCategoryDto,
  CreateMenuItemDto,
  UpdateCategoryDto,
  UpdateMenuItemDto,
} from './dto';
import { MenuService } from './menu.service';

@Controller()
export class MenuController {
  constructor(
    private readonly accessService: AccessService,
    private readonly menuService: MenuService,
  ) {}

  @Get('menu')
  async getPublicMenu(@Query('tenantId') tenantId: string, @Query('branchId') branchId: string): Promise<unknown> {
    await this.accessService.assertTenantActive(tenantId);
    return this.menuService.getPublicMenu(tenantId, branchId);
  }

  @Get('menu/categories')
  async getPublicCategories(
    @Query('tenantId') tenantId: string,
    @Query('branchId') branchId?: string,
  ): Promise<unknown> {
    await this.accessService.assertTenantActive(tenantId);
    return this.menuService.getCategories(tenantId, branchId);
  }

  @UseGuards(StaffJwtGuard, RolesGuard)
  @Roles(UserRole.PlatformAdmin, UserRole.Owner, UserRole.Manager)
  @Post('cms/menu/categories')
  async createCategory(@Body() dto: CreateCategoryDto, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    if (dto.branchId) {
      await this.accessService.assertBranchAccess(user, dto.branchId);
    } else {
      await this.accessService.assertTenantAccess(user, dto.tenantId);
    }
    return this.menuService.createCategory(dto);
  }

  @UseGuards(StaffJwtGuard, RolesGuard)
  @Roles(UserRole.PlatformAdmin, UserRole.Owner, UserRole.Manager)
  @Patch('cms/menu/categories/:id')
  async updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    await this.accessService.assertMenuCategoryAccess(user, id);
    return this.menuService.updateCategory(id, dto);
  }

  @UseGuards(StaffJwtGuard, RolesGuard)
  @Roles(UserRole.PlatformAdmin, UserRole.Owner, UserRole.Manager)
  @Delete('cms/menu/categories/:id')
  async deleteCategory(@Param('id') id: string, @CurrentUser() user: StaffJwtPayload): Promise<{ success: boolean }> {
    await this.accessService.assertMenuCategoryAccess(user, id);
    return this.menuService.deleteCategory(id);
  }

  @UseGuards(StaffJwtGuard, RolesGuard)
  @Roles(UserRole.PlatformAdmin, UserRole.Owner, UserRole.Manager)
  @Post('cms/menu/items')
  async createItem(@Body() dto: CreateMenuItemDto, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    await this.accessService.assertBranchAccess(user, dto.branchId);
    return this.menuService.createItem(dto);
  }

  @UseGuards(StaffJwtGuard, RolesGuard)
  @Roles(UserRole.PlatformAdmin, UserRole.Owner, UserRole.Manager, UserRole.Waiter)
  @Get('cms/menu/items')
  async listItems(@Query('branchId') branchId: string, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    await this.accessService.assertBranchAccess(user, branchId);
    return this.menuService.listItems(branchId);
  }

  @UseGuards(StaffJwtGuard, RolesGuard)
  @Roles(UserRole.PlatformAdmin, UserRole.Owner, UserRole.Manager, UserRole.Waiter)
  @Get('cms/menu/items/:id')
  async getItem(@Param('id') id: string, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    await this.accessService.assertMenuItemAccess(user, id);
    return this.menuService.getItem(id);
  }

  @UseGuards(StaffJwtGuard, RolesGuard)
  @Roles(UserRole.PlatformAdmin, UserRole.Owner, UserRole.Manager)
  @Patch('cms/menu/items/:id')
  async updateItem(@Param('id') id: string, @Body() dto: UpdateMenuItemDto, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    await this.accessService.assertMenuItemAccess(user, id);
    return this.menuService.updateItem(id, dto);
  }

  @UseGuards(StaffJwtGuard, RolesGuard)
  @Roles(UserRole.PlatformAdmin, UserRole.Owner, UserRole.Manager)
  @Delete('cms/menu/items/:id')
  async deleteItem(@Param('id') id: string, @CurrentUser() user: StaffJwtPayload): Promise<{ success: boolean }> {
    await this.accessService.assertMenuItemAccess(user, id);
    return this.menuService.deleteItem(id);
  }
}
