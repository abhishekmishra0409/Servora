import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreatePaymentCheckoutDto {
  @IsString()
  orderId!: string;

  @IsOptional()
  @IsIn(['stripe', 'cash', 'upi', 'manual'])
  provider?: string;
}

export class MarkPaymentPaidDto {
  @IsOptional()
  @IsIn(['cash', 'card', 'upi', 'manual'])
  method?: string;
}
