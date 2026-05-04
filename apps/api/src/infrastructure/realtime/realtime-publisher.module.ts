import { Global, Module } from '@nestjs/common';

import { RealtimePublisher } from './realtime-publisher.service';

@Global()
@Module({
  providers: [RealtimePublisher],
  exports: [RealtimePublisher],
})
export class RealtimePublisherModule {}

