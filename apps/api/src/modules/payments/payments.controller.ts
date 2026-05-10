import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { StaffJwtPayload } from '@restaurent/shared';
import { UserRole } from '@restaurent/shared';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StaffJwtGuard } from '../../common/guards/staff-jwt.guard';
import { AccessService } from '../../infrastructure/access/access.service';
import { CreatePaymentCheckoutDto } from './dto';
import { PaymentsService } from './payments.service';

@Controller()
@UseGuards(StaffJwtGuard, RolesGuard)
export class PaymentsController {
  constructor(
    private readonly accessService: AccessService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Post('orders/:id/bill-request')
  @Roles(UserRole.PlatformAdmin, UserRole.Owner, UserRole.Waiter, UserRole.Cashier)
  async requestBill(@Param('id') id: string, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    await this.accessService.assertOrderAccess(user, id);
    return this.paymentsService.requestBill(id, user.sub);
  }

  @Post('payments/checkout-session')
  @Roles(UserRole.PlatformAdmin, UserRole.Owner, UserRole.Cashier)
  async createCheckoutSession(@Body() dto: CreatePaymentCheckoutDto, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    await this.accessService.assertOrderAccess(user, dto.orderId);
    return this.paymentsService.createCheckoutSession(dto);
  }

  @Get('payments/:id')
  @Roles(UserRole.PlatformAdmin, UserRole.Owner, UserRole.Waiter, UserRole.Cashier)
  async getById(@Param('id') id: string, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    await this.accessService.assertPaymentAccess(user, id);
    return this.paymentsService.getById(id);
  }

  @Post('payments/:id/mark-cash-paid')
  @Roles(UserRole.PlatformAdmin, UserRole.Owner, UserRole.Cashier)
  async markCashPaid(@Param('id') id: string, @CurrentUser() user: StaffJwtPayload): Promise<unknown> {
    await this.accessService.assertPaymentAccess(user, id);
    return this.paymentsService.markCashPaid(id, user.sub);
  }
}
