import { IsArray, IsBoolean, IsEmail, IsIn, IsNumber, IsObject, IsOptional, IsString, Matches, Min, MinLength } from 'class-validator';
import { TENANT_FEATURE_KEYS } from '@restaurent/shared';

export class CreateTenantDto {
  @IsString()
  legalName!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

  @IsOptional()
  @IsIn(['active', 'suspended', 'archived'])
  status?: string;

  @IsOptional()
  @IsString()
  defaultCurrency?: string;

  @IsOptional()
  @IsString()
  defaultTimezone?: string;

  @IsOptional()
  @IsArray()
  @IsIn(TENANT_FEATURE_KEYS, { each: true })
  enabledFeatures?: string[];

  @IsOptional()
  @IsString()
  ownerName?: string;

  @IsEmail()
  ownerEmail!: string;

  @IsString()
  @MinLength(8)
  ownerPassword!: string;
}

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  legalName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

  @IsOptional()
  @IsIn(['active', 'suspended', 'archived'])
  status?: string;

  @IsOptional()
  @IsString()
  defaultCurrency?: string;

  @IsOptional()
  @IsString()
  defaultTimezone?: string;
}

export class UpdateTenantStatusDto {
  @IsIn(['active', 'suspended', 'archived'])
  status!: string;
}

export class UpdateTenantFeaturesDto {
  @IsArray()
  @IsIn(TENANT_FEATURE_KEYS, { each: true })
  enabledFeatures!: string[];
}

export class UpdatePlanSettingsDto {
  @IsOptional()
  @IsBoolean()
  visible?: boolean;

  @IsOptional()
  @IsString()
  badge?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  employeeLimit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  branchLimit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tableLimit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyBillLimit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  menuItemLimit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  customRoleLimit?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  perks?: string[];
}

export class UpdateTenantEntitlementsDto {
  /**
   * Per-tenant limit overrides for custom deals. A key set here wins over the
   * plan; omit a key to inherit.
   */
  @IsObject()
  overrides!: Record<string, number | null>;

  /**
   * Feature flags for this tenant, overriding the plan's list entirely.
   * Lets support grant a capability without moving the tenant to another tier.
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];
}
