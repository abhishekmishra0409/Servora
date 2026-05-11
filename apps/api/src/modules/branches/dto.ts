import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { BranchServiceMode } from '@restaurent/shared';

export class UpdateBranchDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(BranchServiceMode)
  serviceMode?: BranchServiceMode;

  @IsOptional()
  @IsObject()
  address?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  hours?: Record<string, unknown>;
}
