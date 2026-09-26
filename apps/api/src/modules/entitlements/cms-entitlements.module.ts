import { Module } from '@nestjs/common';

import { CmsEntitlementsController } from './entitlements.controller';

@Module({
  controllers: [CmsEntitlementsController],
})
export class CmsEntitlementsModule {}
