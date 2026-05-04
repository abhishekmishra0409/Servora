import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import configuration from './config/configuration';
import { resolveEnvFiles } from './config/env-files';
import { validateEnv } from './config/validate-env';
import { DatabaseModule } from './database/mongoose.module';
import { AccessModule } from './infrastructure/access/access.module';
import { AuditModule } from './infrastructure/audit/audit.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { RealtimePublisherModule } from './infrastructure/realtime/realtime-publisher.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { AuthModule } from './modules/auth/auth.module';
import { BillingModule } from './modules/billing/billing.module';
import { BranchesModule } from './modules/branches/branches.module';
import { FloorsModule } from './modules/floors/floors.module';
import { HealthModule } from './modules/health/health.module';
import { MediaModule } from './modules/media/media.module';
import { MenuModule } from './modules/menu/menu.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
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
    AccessModule,
    AuditModule,
    QueueModule,
    RealtimePublisherModule,
    HealthModule,
    AuditLogsModule,
    AuthModule,
    TenantsModule,
    BranchesModule,
    MenuModule,
    TablesModule,
    FloorsModule,
    SessionsModule,
    OrdersModule,
    PaymentsModule,
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
