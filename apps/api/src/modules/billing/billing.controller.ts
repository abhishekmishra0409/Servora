import { Body, Controller, ForbiddenException, Get, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { UserRole, type StaffJwtPayload } from '@restaurent/shared';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StaffJwtGuard } from '../../common/guards/staff-jwt.guard';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';
import { BillingService } from './billing.service';
import { CheckoutSessionDto, CustomerPortalDto } from './dto';

@Controller('billing')
@UseGuards(StaffJwtGuard, RolesGuard)
@Roles(UserRole.SuperAdmin, UserRole.PlatformAdmin, UserRole.Owner)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('plans')
  plans(): Promise<unknown> {
    return this.billingService.listConfiguredPlans();
  }

  @Get('summary')
  summary(@Query('tenantId') tenantId: string, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    this.assertBillingTenantAccess(user, tenantId);
    return this.billingService.summary(tenantId);
  }

  @UseInterceptors(IdempotencyInterceptor)
  @Post('checkout-session')
  checkoutSession(@Body() dto: CheckoutSessionDto, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    this.assertBillingTenantAccess(user, dto.tenantId);
    return this.billingService.createCheckoutSession(dto);
  }

  @Post('customer-portal')
  customerPortal(@Body() dto: CustomerPortalDto, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    this.assertBillingTenantAccess(user, dto.tenantId);
    return this.billingService.createCustomerPortal(dto);
  }

  private assertBillingTenantAccess(user: StaffJwtPayload, tenantId: string): void {
    if ([UserRole.SuperAdmin, UserRole.PlatformAdmin].includes(user.role) || user.tenantId === tenantId) {
      return;
    }

    throw new ForbiddenException('Tenant access denied');
  }
}
