import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import { PublicService } from './public.service';

// Unauthenticated QR-token endpoints — throttle to limit token enumeration.
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 60, ttl: 60_000 } })
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('table-context')
  getTableContext(@Query('qrToken') qrToken: string): Promise<unknown> {
    return this.publicService.getTableContext(qrToken);
  }

  @Get('orders')
  getOrdersForQr(@Query('qrToken') qrToken: string): Promise<unknown> {
    return this.publicService.getOrdersForQr(qrToken);
  }

  @Get('orders/:id/status')
  getOrderStatus(
    @Param('id') id: string,
    @Query('qrToken') qrToken: string,
  ): Promise<unknown> {
    return this.publicService.getOrderStatus(id, qrToken);
  }

  @Get('orders/:id/payment')
  getOrderPayment(
    @Param('id') id: string,
    @Query('qrToken') qrToken: string,
  ): Promise<unknown> {
    return this.publicService.getPaymentForOrder(id, qrToken);
  }
}
