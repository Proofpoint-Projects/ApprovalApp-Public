import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SessionAuthGuard } from './common/guards/session-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { QuarantineModule } from './modules/quarantine/quarantine.module';
import { ApprovalsModule } from './modules/approvals/approvals.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { AdminModule } from './modules/admin/admin.module';
import { ScreenshotsModule } from './modules/screenshots/screenshots.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    AuditModule,
    AuthModule,
    IntegrationsModule,
    QuarantineModule,
    ApprovalsModule,
    WebhooksModule,
    ScreenshotsModule,
    AdminModule
  ],
  providers: [SessionAuthGuard, RolesGuard]
})
export class AppModule {}
