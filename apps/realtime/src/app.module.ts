import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { SocketAuthService } from './auth/socket-auth.service';
import { resolveEnvFiles } from './env-files';
import { OrderGateway } from './gateways/order.gateway';
import { ServiceRequestGateway } from './gateways/service-request.gateway';
import { TableSessionGateway } from './gateways/table-session.gateway';

@Module({
  imports: [ConfigModule.forRoot({ envFilePath: resolveEnvFiles(), isGlobal: true }), JwtModule.register({})],
  providers: [SocketAuthService, TableSessionGateway, OrderGateway, ServiceRequestGateway],
})
export class AppModule {}
