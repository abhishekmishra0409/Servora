import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@restaurent/shared';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StaffJwtGuard } from '../../common/guards/staff-jwt.guard';
import {
  CreateCategoryDto,
  CreateMenuItemDto,
  UpdateCategoryDto,
  UpdateMenuItemDto,
} from './dto';
import { MenuService } from './menu.service';

@Controller()
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get('menu')
  getPublicMenu(@Query('tenantId') tenantId: string, @Query('branchId') branchId: string): Promise<unknown> {
    return this.menuService.getPublicMenu(tenantId, branchId);
  }

  @Get('menu/categories')
  getPublicCategories(
    @Query('tenantId') tenantId: string,
    @Query('branchId') branchId?: string,
  ): Promise<unknown> {
    return this.menuService.getCategories(tenantId, branchId);
  }

  @UseGuards(StaffJwtGuard, RolesGuard)
  @Roles(UserRole.Owner, UserRole.Manager)
  @Post('cms/menu/categories')
  createCategory(@Body() dto: CreateCategoryDto): Promise<unknown> {
    return this.menuService.createCategory(dto);
  }

  @UseGuards(StaffJwtGuard, RolesGuard)
  @Roles(UserRole.Owner, UserRole.Manager)
  @Patch('cms/menu/categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto): Promise<unknown> {
    return this.menuService.updateCategory(id, dto);
  }

  @UseGuards(StaffJwtGuard, RolesGuard)
  @Roles(UserRole.Owner, UserRole.Manager)
  @Delete('cms/menu/categories/:id')
  deleteCategory(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.menuService.deleteCategory(id);
  }

  @UseGuards(StaffJwtGuard, RolesGuard)
  @Roles(UserRole.Owner, UserRole.Manager)
  @Post('cms/menu/items')
  createItem(@Body() dto: CreateMenuItemDto): Promise<unknown> {
    return this.menuService.createItem(dto);
  }

  @UseGuards(StaffJwtGuard, RolesGuard)
  @Roles(UserRole.Owner, UserRole.Manager, UserRole.Waiter)
  @Get('cms/menu/items')
  listItems(@Query('branchId') branchId: string): Promise<unknown> {
    return this.menuService.listItems(branchId);
  }

  @UseGuards(StaffJwtGuard, RolesGuard)
  @Roles(UserRole.Owner, UserRole.Manager, UserRole.Waiter)
  @Get('cms/menu/items/:id')
  getItem(@Param('id') id: string): Promise<unknown> {
    return this.menuService.getItem(id);
  }

  @UseGuards(StaffJwtGuard, RolesGuard)
  @Roles(UserRole.Owner, UserRole.Manager)
  @Patch('cms/menu/items/:id')
  updateItem(@Param('id') id: string, @Body() dto: UpdateMenuItemDto): Promise<unknown> {
    return this.menuService.updateItem(id, dto);
  }

  @UseGuards(StaffJwtGuard, RolesGuard)
  @Roles(UserRole.Owner, UserRole.Manager)
  @Delete('cms/menu/items/:id')
  deleteItem(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.menuService.deleteItem(id);
  }
}
