import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '@restaurent/shared';

export class CreateStaffDto {
  @IsString()
  tenantId!: string;

  @IsString()
  branchId!: string;

  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  role!: UserRole;
}

export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
