import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import configuration from './config/configuration';
import { resolveEnvFiles } from './config/env-files';
import { validateEnv } from './config/validate-env';
import { DatabaseModule } from './database/mongoose.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { BillingModule } from './modules/billing/billing.module';
import { BranchesModule } from './modules/branches/branches.module';
import { HealthModule } from './modules/health/health.module';
import { MediaModule } from './modules/media/media.module';
import { MenuModule } from './modules/menu/menu.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PublicModule } from './modules/public/public.module';
import { ServiceRequestsModule } from './modules/service-requests/service-requests.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { StaffModule } from './modules/staff/staff.module';
import { TablesModule } from './modules/tables/tables.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: resolveEnvFiles(),
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    TenantsModule,
    BranchesModule,
    MenuModule,
    TablesModule,
    SessionsModule,
    OrdersModule,
    PublicModule,
    ServiceRequestsModule,
    StaffModule,
    MediaModule,
    AnalyticsModule,
    BillingModule,
    WebhooksModule,
  ],
})
export class AppModule {}
