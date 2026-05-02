import { IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class BucketAddonDto {
  @IsString()
  id!: string;

  @IsString()
  label!: string;

  @IsNumber()
  priceDelta!: number;
}

export class CreateGuestSessionDto {
  @IsString()
  qrToken!: string;

  @IsString()
  alias!: string;
}

export class JoinTableSessionDto extends CreateGuestSessionDto {}

export class AddBucketItemDto {
  @IsString()
  menuItemId!: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BucketAddonDto)
  addons?: BucketAddonDto[];
}

export class UpdateBucketItemDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class SubmitBucketDto {
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
