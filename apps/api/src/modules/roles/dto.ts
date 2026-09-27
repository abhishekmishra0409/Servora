import { ArrayMaxSize, IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(400)
  permissions!: string[];

  @IsString()
  tenantId!: string;

  /** Built-in role this was duplicated from. Recorded for provenance only. */
  @IsOptional()
  @IsString()
  derivedFrom?: string;
}

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(400)
  permissions?: string[];
}
