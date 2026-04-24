import { Module } from '@nestjs/common';
import { QuarantineController } from './quarantine.controller';
import { QuarantineService } from './quarantine.service';
import { IntegrationsModule } from '../integrations/integrations.module';
import { AuditModule } from '../audit/audit.module';
import { ApprovalsModule } from '../approvals/approvals.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [IntegrationsModule, AuditModule, ApprovalsModule, AdminModule],
  controllers: [QuarantineController],
  providers: [QuarantineService],
  exports: [QuarantineService]
})
export class QuarantineModule {}