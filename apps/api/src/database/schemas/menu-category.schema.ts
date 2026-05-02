import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

import { Branch } from './branch.schema';
import { Tenant } from './tenant.schema';

class MenuSubcategory {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ default: 0 })
  sortOrder!: number;

  @Prop({ default: true })
  visible!: boolean;
}

export type MenuCategoryDocument = HydratedDocument<MenuCategory>;

@Schema({ collection: 'menu_categories', timestamps: true })
export class MenuCategory {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Tenant.name, required: true, index: true })
  tenantId!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Branch.name, index: true })
  branchId?: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ default: 0 })
  sortOrder!: number;

  @Prop({ default: true })
  visible!: boolean;

  @Prop({ type: [MenuSubcategory], default: [] })
  subcategories!: MenuSubcategory[];
}

export const MenuCategorySchema = SchemaFactory.createForClass(MenuCategory);
MenuCategorySchema.index({ tenantId: 1, branchId: 1, name: 1 }, { unique: true });

