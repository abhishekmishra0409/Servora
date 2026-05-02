import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { MenuCategory } from '../../database/schemas/menu-category.schema';
import { MenuItem } from '../../database/schemas/menu-item.schema';
import { CreateCategoryDto, CreateMenuItemDto, UpdateCategoryDto, UpdateMenuItemDto } from './dto';

type LeanMenuItem = MenuItem & { _id?: unknown; media?: { url?: unknown } };

@Injectable()
export class MenuService {
  constructor(
    @InjectModel(MenuCategory.name) private readonly categoryModel: Model<MenuCategory>,
    @InjectModel(MenuItem.name) private readonly itemModel: Model<MenuItem>,
  ) {}

  async getPublicMenu(tenantId: string, branchId: string): Promise<{ categories: MenuCategory[]; items: unknown[] }> {
    const [categories, items] = await Promise.all([
      this.categoryModel.find({ tenantId, $or: [{ branchId }, { branchId: { $exists: false } }] }).lean().exec(),
      this.itemModel.find({ tenantId, branchId, available: true }).lean<LeanMenuItem[]>().exec(),
    ]);

    return {
      categories,
      items: items.map((item) => ({
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
    return this.categoryModel.create({
      ...dto,
      visible: true,
    });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto): Promise<MenuCategory> {
    const category = await this.categoryModel
      .findByIdAndUpdate(id, dto, { returnDocument: 'after' })
      .exec();

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async deleteCategory(id: string): Promise<{ success: boolean }> {
    await this.categoryModel.findByIdAndDelete(id).exec();
    await this.itemModel.updateMany({ categoryId: id }, { available: false }).exec();
    return { success: true };
  }

  async createItem(dto: CreateMenuItemDto): Promise<MenuItem> {
    return this.itemModel.create({
      ...dto,
      allergens: dto.allergens ?? [],
      available: dto.available ?? true,
      branchOverrides: dto.branchOverrides ?? [],
      dietaryFlags: dto.dietaryFlags ?? [],
      schedules: dto.schedules ?? [],
      variants: dto.variants ?? [],
    });
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

    return item;
  }

  async deleteItem(id: string): Promise<{ success: boolean }> {
    await this.itemModel.findByIdAndDelete(id).exec();
    return { success: true };
  }
}
