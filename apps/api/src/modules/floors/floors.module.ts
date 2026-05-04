import { Module } from '@nestjs/common';

import { FloorsController } from './floors.controller';
import { FloorsService } from './floors.service';

@Module({
  controllers: [FloorsController],
  providers: [FloorsService],
})
export class FloorsModule {}

