import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { MenuCategory } from '../../database/schemas/menu-category.schema';
import { MenuItem } from '../../database/schemas/menu-item.schema';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { RealtimePublisher } from '../../infrastructure/realtime/realtime-publisher.service';
import { CreateCategoryDto, CreateMenuItemDto, UpdateCategoryDto, UpdateMenuItemDto } from './dto';

type LeanMenuItem = MenuItem & { _id?: unknown; media?: { url?: unknown } };

@Injectable()
export class MenuService {
  constructor(
    @InjectModel(MenuCategory.name) private readonly categoryModel: Model<MenuCategory>,
    @InjectModel(MenuItem.name) private readonly itemModel: Model<MenuItem>,
    private readonly auditService: AuditService,
    private readonly realtimePublisher: RealtimePublisher,
  ) { }

  async getPublicMenu(tenantId: string, branchId: string): Promise<{ categories: MenuCategory[]; items: unknown[] }> {
    const [categories, items] = await Promise.all([
      this.categoryModel.find({ tenantId, $or: [{ branchId }, { branchId: { $exists: false } }] }).lean().exec(),
      this.itemModel.find({ tenantId, branchId, available: true }).lean<LeanMenuItem[]>().exec(),
    ]);
    const availableItems = items.filter((item) => this.isScheduleActive(item.schedules));

    return {
      categories,
      items: availableItems.map((item) => ({
        ...item,
        id: String(item._id ?? ''),
        imageUrl: typeof item.media?.url === 'string' ? item.media.url : undefined,
      })),
    };
  }

  async getCategories(tenantId: string, branchId?: string): Promise<MenuCategory[]> {
    return this.categoryModel.find({ tenantId, ...(branchId ? { branchId } : {}) }).lean().exec();
  }

  async createCategory(dto: CreateCategoryDto): Promise<MenuCategory> {
    const category = await this.categoryModel.create({
      ...dto,
      visible: true,
    });
    await this.auditService.record({
      action: 'menu_category.created',
      branchId: dto.branchId,
      entityId: String(category._id),
      entityType: 'menu_category',
      tenantId: dto.tenantId,
    });
    if (category.branchId) {
      await this.realtimePublisher.publishRealtimeEvent(`branch:${category.branchId}`, 'menu.changed', {
        branchId: category.branchId,
        categoryId: String(category._id),
        changeType: 'created',
      });
    }
    return category;
  }

  async updateCategory(id: string, dto: UpdateCategoryDto): Promise<MenuCategory> {
    const category = await this.categoryModel
      .findByIdAndUpdate(id, dto, { returnDocument: 'after' })
      .exec();

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    await this.auditService.record({
      action: 'menu_category.updated',
      branchId: category.branchId,
      entityId: String(category._id),
      entityType: 'menu_category',
      tenantId: category.tenantId,
    });
    if (category.branchId) {
      await this.realtimePublisher.publishRealtimeEvent(`branch:${category.branchId}`, 'menu.changed', {
        branchId: category.branchId,
        categoryId: String(category._id),
        changeType: 'updated',
      });
    }
    return category;
  }

  async deleteCategory(id: string): Promise<{ success: boolean }> {
    const category = await this.categoryModel.findByIdAndDelete(id).exec();
    await this.itemModel.updateMany({ categoryId: id }, { available: false }).exec();
    if (category) {
      await this.auditService.record({
        action: 'menu_category.deleted',
        branchId: category.branchId,
        entityId: String(category._id),
        entityType: 'menu_category',
        tenantId: category.tenantId,
      });
      if (category.branchId) {
        await this.realtimePublisher.publishRealtimeEvent(`branch:${category.branchId}`, 'menu.changed', {
          branchId: category.branchId,
          categoryId: String(category._id),
          changeType: 'deleted',
        });
      }
    }
    return { success: true };
  }

  async createItem(dto: CreateMenuItemDto): Promise<MenuItem> {
    const item = await this.itemModel.create({
      ...dto,
      allergens: dto.allergens ?? [],
      available: dto.available ?? true,
      branchOverrides: dto.branchOverrides ?? [],
      dietaryFlags: dto.dietaryFlags ?? [],
      schedules: dto.schedules ?? [],
      variants: dto.variants ?? [],
    });
    await this.auditService.record({
      action: 'menu_item.created',
      branchId: dto.branchId,
      entityId: String(item._id),
      entityType: 'menu_item',
      tenantId: dto.tenantId,
    });
    await this.realtimePublisher.publishRealtimeEvent(`branch:${item.branchId}`, 'menu.changed', {
      branchId: item.branchId,
      changeType: 'created',
      menuItemId: String(item._id),
    });
    return item;
  }

  async listItems(branchId: string): Promise<MenuItem[]> {
    return this.itemModel.find({ branchId }).sort({ createdAt: -1 }).lean().exec();
  }

  async getItem(id: string): Promise<MenuItem> {
    const item = await this.itemModel.findById(id).lean().exec();

    if (!item) {
      throw new NotFoundException('Menu item not found');
    }

    return item;
  }

  async updateItem(id: string, dto: UpdateMenuItemDto): Promise<MenuItem> {
    const item = await this.itemModel
      .findByIdAndUpdate(id, dto, { returnDocument: 'after' })
      .exec();

    if (!item) {
      throw new NotFoundException('Menu item not found');
    }
    await this.auditService.record({
      action: 'menu_item.updated',
      branchId: item.branchId,
      entityId: String(item._id),
      entityType: 'menu_item',
      tenantId: item.tenantId,
    });
    await this.realtimePublisher.publishRealtimeEvent(`branch:${item.branchId}`, 'menu.changed', {
      branchId: item.branchId,
      changeType: 'updated',
      menuItemId: String(item._id),
    });
    return item;
  }

  async deleteItem(id: string): Promise<{ success: boolean }> {
    const item = await this.itemModel.findByIdAndDelete(id).exec();
    if (item) {
      await this.auditService.record({
        action: 'menu_item.deleted',
        branchId: item.branchId,
        entityId: String(item._id),
        entityType: 'menu_item',
        tenantId: item.tenantId,
      });
      await this.realtimePublisher.publishRealtimeEvent(`branch:${item.branchId}`, 'menu.changed', {
        branchId: item.branchId,
        changeType: 'deleted',
        menuItemId: String(item._id),
      });
    }
    return { success: true };
  }

  private isScheduleActive(schedules: { days?: string[]; endTime?: string; startTime?: string }[] | undefined): boolean {
    if (!schedules?.length) {
      return true;
    }

    const now = new Date();
    const day = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const dayShort = day.slice(0, 3); // e.g. monday -> mon
    const minutes = now.getHours() * 60 + now.getMinutes();

    return schedules.some((schedule) => {
      const days = (schedule.days ?? []).map((value) => value.toLowerCase());
      // Accept both full weekday names (monday) and 3-letter abbreviations (mon)
      if (days.length && !days.includes(day) && !days.includes(dayShort)) {
        return false;
      }

      const start = this.parseTime(schedule.startTime);
      const end = this.parseTime(schedule.endTime);
      return start === null || end === null || (minutes >= start && minutes <= end);
    });
  }

  private parseTime(value: string | undefined): number | null {
    if (!value) {
      return null;
    }
    const [hours, minutes] = value.split(':').map(Number) as [number | undefined, number | undefined];
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      return null;
    }
    return (hours ?? 0) * 60 + (minutes ?? 0);
  }
}
