import { IsString } from 'class-validator';

export class CheckoutSessionDto {
  @IsString()
  tenantId!: string;

  @IsString()
  planCode!: string;
}

export class CustomerPortalDto {
  @IsString()
  tenantId!: string;
}
