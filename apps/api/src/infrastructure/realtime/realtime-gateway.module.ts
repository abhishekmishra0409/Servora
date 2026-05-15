import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { OrderGateway } from './gateways/order.gateway';
import { ServiceRequestGateway } from './gateways/service-request.gateway';
import { TableSessionGateway } from './gateways/table-session.gateway';
import { RealtimePublisherModule } from './realtime-publisher.module';
import { SocketAuthService } from './socket-auth.service';

@Module({
  imports: [JwtModule.register({}), RealtimePublisherModule],
  providers: [SocketAuthService, TableSessionGateway, OrderGateway, ServiceRequestGateway],
})
export class RealtimeGatewayModule {}
