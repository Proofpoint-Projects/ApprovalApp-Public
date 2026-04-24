import { SetupService } from './setup.service';
import { SetupController } from './setup.controller';
import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { AdminController } from './admin.controller';
import { ProofpointConfigController } from './proofpoint-config.controller';
import { ApproverScopesController } from './approver-scopes.controller';
import { ApproverScopesService } from './approver-scopes.service';

@Module({
  providers: [SetupService, ApproverScopesService],
  imports: [AuditModule, IntegrationsModule],
  controllers: [
    AdminController,
    ProofpointConfigController,
    SetupController,
    ApproverScopesController
  ],
  exports: [SetupService]
})
export class AdminModule {}