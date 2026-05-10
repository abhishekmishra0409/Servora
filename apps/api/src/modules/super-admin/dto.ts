import { IsArray, IsBoolean, IsEmail, IsIn, IsNumber, IsOptional, IsString, Matches, Min, MinLength } from 'class-validator';
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
  @IsArray()
  @IsString({ each: true })
  perks?: string[];
}
