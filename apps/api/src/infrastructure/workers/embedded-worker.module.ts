import { Module } from '@nestjs/common';

import { EmbeddedWorkerService } from './embedded-worker.service';

@Module({
  providers: [EmbeddedWorkerService],
})
export class EmbeddedWorkerModule {}
