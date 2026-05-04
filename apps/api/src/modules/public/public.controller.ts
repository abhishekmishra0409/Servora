import { Controller, Get, Param, Query } from '@nestjs/common';

import { PublicService } from './public.service';

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
