import { Body, Controller, Delete, Param, Patch, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import type { GuestJwtPayload } from '@restaurent/shared';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GuestJwtGuard } from '../../common/guards/guest-jwt.guard';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';
import {
  AddBucketItemDto,
  CreateGuestSessionDto,
  JoinTableSessionDto,
  SubmitBucketDto,
  UpdateBucketItemDto,
} from './dto';
import { SessionsService } from './sessions.service';

@Controller()
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post('guest-sessions')
  createGuestSession(@Body() dto: CreateGuestSessionDto): Promise<unknown> {
    return this.sessionsService.createGuestSession(dto);
  }

  @Post('table-sessions/join')
  joinTableSession(@Body() dto: JoinTableSessionDto): Promise<unknown> {
    return this.sessionsService.joinTableSession(dto);
  }

  @UseGuards(GuestJwtGuard)
  @Post('buckets/:tableSessionId/items')
  addBucketItem(
    @CurrentUser() user: GuestJwtPayload,
    @Body() dto: AddBucketItemDto,
  ): Promise<unknown> {
    return this.sessionsService.addBucketItem(user, dto);
  }

  @UseGuards(GuestJwtGuard)
  @Patch('buckets/:tableSessionId/items/:itemId')
  updateBucketItem(
    @CurrentUser() user: GuestJwtPayload,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateBucketItemDto,
  ): Promise<unknown> {
    return this.sessionsService.updateBucketItem(user, itemId, dto);
  }

  @UseGuards(GuestJwtGuard)
  @Delete('buckets/:tableSessionId/items/:itemId')
  removeBucketItem(
    @CurrentUser() user: GuestJwtPayload,
    @Param('itemId') itemId: string,
  ): Promise<unknown> {
    return this.sessionsService.removeBucketItem(user, itemId);
  }

  @UseGuards(GuestJwtGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @Post('buckets/:tableSessionId/submit')
  submitBucket(
    @CurrentUser() user: GuestJwtPayload,
    @Body() dto: SubmitBucketDto,
  ): Promise<unknown> {
    return this.sessionsService.submitBucket(user, dto);
  }
}

