import { Controller, Headers, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

import { WebhooksService } from './webhooks.service';

type RawBodyRequest = Request & { rawBody?: Buffer };

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('stripe')
  stripe(
    @Req() request: RawBodyRequest,
    @Headers('stripe-signature') signature?: string,
  ): Promise<{ accepted: boolean; duplicate: boolean }> {
    return this.webhooksService.handleStripe(request.rawBody ?? Buffer.from('{}'), signature);
  }
}
