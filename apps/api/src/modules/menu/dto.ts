import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class SubcategoryDto {
  @IsString()
  id!: string;

  @IsString()
  name!: string;

  @IsNumber()
  @Min(0)
  sortOrder!: number;
}

class VariantDto {
  @IsString()
  id!: string;

  @IsString()
  label!: string;

  @IsNumber()
  priceDelta!: number;
}

class AddonOptionDto {
  @IsString()
  id!: string;

  @IsString()
  label!: string;

  @IsNumber()
  priceDelta!: number;
}

class AddonGroupDto {
  @IsString()
  id!: string;

  @IsString()
  label!: string;

  @IsNumber()
  minSelections!: number;

  @IsNumber()
  maxSelections!: number;

  @ValidateNested({ each: true })
  @Type(() => AddonOptionDto)
  options!: AddonOptionDto[];
}

class ScheduleDto {
  @IsArray()
  @IsString({ each: true })
  days!: string[];

  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;
}

class BranchOverrideDto {
  @IsString()
  branchId!: string;

  @IsBoolean()
  available!: boolean;

  @IsOptional()
  @IsNumber()
  priceOverride?: number;
}

export class CreateCategoryDto {
  @IsString()
  tenantId!: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SubcategoryDto)
  subcategories?: SubcategoryDto[];
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SubcategoryDto)
  subcategories?: SubcategoryDto[];
}

export class CreateMenuItemDto {
  @IsString()
  tenantId!: string;

  @IsString()
  branchId!: string;

  @IsString()
  categoryId!: string;

  @IsOptional()
  @IsString()
  subcategoryId?: string;

  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  price!: number;

  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dietaryFlags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergens?: string[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants?: VariantDto[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AddonGroupDto)
  addonGroups?: AddonGroupDto[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ScheduleDto)
  schedules?: ScheduleDto[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BranchOverrideDto)
  branchOverrides?: BranchOverrideDto[];

  @IsOptional()
  @IsObject()
  media?: Record<string, unknown>;
}

export class UpdateMenuItemDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  subcategoryId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dietaryFlags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergens?: string[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants?: VariantDto[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AddonGroupDto)
  addonGroups?: AddonGroupDto[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ScheduleDto)
  schedules?: ScheduleDto[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BranchOverrideDto)
  branchOverrides?: BranchOverrideDto[];

  @IsOptional()
  @IsObject()
  media?: Record<string, unknown>;
}
