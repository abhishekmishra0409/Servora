import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateFloorDto {
  @IsString()
  tenantId!: string;

  @IsString()
  branchId!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class UpdateFloorDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

