import { Body, Controller, Get, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { UserRole } from '@restaurent/shared';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StaffJwtGuard } from '../../common/guards/staff-jwt.guard';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';
import { BillingService } from './billing.service';
import { CheckoutSessionDto, CustomerPortalDto } from './dto';

@Controller('billing')
@UseGuards(StaffJwtGuard, RolesGuard)
@Roles(UserRole.Owner)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('summary')
  summary(@Query('tenantId') tenantId: string): Promise<unknown> {
    return this.billingService.summary(tenantId);
  }

  @UseInterceptors(IdempotencyInterceptor)
  @Post('checkout-session')
  checkoutSession(@Body() dto: CheckoutSessionDto): Promise<unknown> {
    return this.billingService.createCheckoutSession(dto);
  }

  @Post('customer-portal')
  customerPortal(@Body() dto: CustomerPortalDto): Promise<unknown> {
    return this.billingService.createCustomerPortal(dto);
  }
}
