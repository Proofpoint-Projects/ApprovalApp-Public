import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { ApprovalsController } from './approvals.controller';
import { ApprovalsService } from './approvals.service';
import { EndpointApprovalReaperService } from './endpoint-approval-reaper.service';
 
@Module({
  imports: [PrismaModule, AuditModule, IntegrationsModule],
  controllers: [ApprovalsController],
  providers: [ApprovalsService, EndpointApprovalReaperService],
  exports: [ApprovalsService]
})
export class ApprovalsModule {}