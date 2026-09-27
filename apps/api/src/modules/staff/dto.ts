import { IsBoolean, IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

/**
 * Role keys are validated in the service against the tenant's assignable set
 * (built-ins plus that tenant's own roles), not by an enum — a tenant-defined
 * key like `floor-lead` is not a `UserRole` value.
 */
const ROLE_KEY = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

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
  @Matches(ROLE_KEY, { message: 'role must be a valid role key' })
  role!: string;
}

export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(ROLE_KEY, { message: 'role must be a valid role key' })
  role?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
