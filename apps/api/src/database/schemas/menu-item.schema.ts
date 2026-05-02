import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

import { Branch } from './branch.schema';
import { MenuCategory } from './menu-category.schema';
import { Tenant } from './tenant.schema';

class Variant {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true })
  label!: string;

  @Prop({ default: 0 })
  priceDelta!: number;
}

class AddonOption {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true })
  label!: string;

  @Prop({ default: 0 })
  priceDelta!: number;
}

class AddonGroup {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true })
  label!: string;

  @Prop({ default: 0 })
  minSelections!: number;

  @Prop({ default: 1 })
  maxSelections!: number;

  @Prop({ type: [AddonOption], default: [] })
  options!: AddonOption[];
}

class ScheduleWindow {
  @Prop({ type: [String], default: [] })
  days!: string[];

  @Prop({ required: true })
  startTime!: string;

  @Prop({ required: true })
  endTime!: string;
}

class BranchOverride {
  @Prop({ required: true })
  branchId!: string;

  @Prop({ default: true })
  available!: boolean;

  @Prop()
  priceOverride?: number;
}

export type MenuItemDocument = HydratedDocument<MenuItem>;

@Schema({ collection: 'menu_items', timestamps: true })
export class MenuItem {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Tenant.name, required: true, index: true })
  tenantId!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Branch.name, required: true, index: true })
  branchId!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: MenuCategory.name, required: true })
  categoryId!: string;

  @Prop()
  subcategoryId?: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  slug!: string;

  @Prop({ default: '' })
  description!: string;

  @Prop({ required: true })
  price!: number;

  @Prop({ default: true })
  available!: boolean;

  @Prop({ type: [String], default: [] })
  dietaryFlags!: string[];

  @Prop({ type: [String], default: [] })
  allergens!: string[];

  @Prop({ type: [Variant], default: [] })
  variants!: Variant[];

  @Prop({ type: [AddonGroup], default: [] })
  addonGroups!: AddonGroup[];

  @Prop({ type: [ScheduleWindow], default: [] })
  schedules!: ScheduleWindow[];

  @Prop({ type: [BranchOverride], default: [] })
  branchOverrides!: BranchOverride[];

  @Prop({ type: Object })
  media?: Record<string, unknown>;
}

export const MenuItemSchema = SchemaFactory.createForClass(MenuItem);
MenuItemSchema.index({ tenantId: 1, branchId: 1, slug: 1 }, { unique: true });

