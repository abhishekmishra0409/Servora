import { Global, Module } from '@nestjs/common';

import { AccessService } from './access.service';
import { PermissionResolverService } from './permission-resolver.service';

@Global()
@Module({
  providers: [AccessService, PermissionResolverService],
  exports: [AccessService, PermissionResolverService],
})
export class AccessModule {}
