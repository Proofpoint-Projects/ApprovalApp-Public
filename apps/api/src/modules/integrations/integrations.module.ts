import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { IntegrationsService } from './integrations.service';
import { SecretCryptoService } from './secret-crypto.service';
import { ProofpointAuthService } from './proofpoint-auth.service';
import { ProofpointEmailAdapter } from './proofpoint-email.adapter';
import { ProofpointEmailEventsService } from './proofpoint-email-events.service';
import { ProofpointRulerService } from './proofpoint-ruler.service';

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [
    IntegrationsService,
    SecretCryptoService,
    ProofpointAuthService,
    ProofpointEmailAdapter,
    ProofpointEmailEventsService,
    ProofpointRulerService
  ],
  exports: [
    IntegrationsService,
    SecretCryptoService,
    ProofpointAuthService,
    ProofpointEmailAdapter,
    ProofpointEmailEventsService,
    ProofpointRulerService
  ]
})
export class IntegrationsModule {}
