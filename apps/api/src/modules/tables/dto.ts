import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateTableDto {
  @IsString()
  tenantId!: string;

  @IsString()
  branchId!: string;

  @IsString()
  floorId!: string;

  @IsString()
  tableNo!: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  capacity?: number;
}

export class UpdateTableDto {
  @IsOptional()
  @IsString()
  floorId?: string;

  @IsOptional()
  @IsString()
  tableNo?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  capacity?: number;
}

export class RegenerateQrDto {
  @IsString()
  tableId!: string;
}

