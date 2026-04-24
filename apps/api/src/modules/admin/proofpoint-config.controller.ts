import { Body, Controller, Delete, Get, Post, Req } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { ProofpointAuthService } from '../integrations/proofpoint-auth.service';
import { SaveProofpointConfigDto } from './dto/save-proofpoint-config.dto';
import { AuditService } from '../audit/audit.service';

@Roles('ADMIN')
@Controller('admin/integrations/proofpoint-config')
export class ProofpointConfigController {
  constructor(
    private readonly proofpointAuthService: ProofpointAuthService,
    private readonly auditService: AuditService
  ) {}

  @Get()
  async getProofpointConfig() {
    const cfg = await this.proofpointAuthService.getConfig();

    if (!cfg) {
      return {
        configured: false,
        healthy: false,
        status: 'not_configured',
        clientId: null,
        hasClientId: false,
        hasClientSecret: false,
        tokenExpiresAt: null,
        statusMessage: 'Nenhuma configuracao cadastrada.'
      };
    }

    let healthy = false;
    let statusMessage = 'Configuracao cadastrada.';

    try {
      await this.proofpointAuthService.getValidBearerToken(false);
      healthy = true;
      statusMessage = 'Configuracao valida e token operacional.';
    } catch (error: any) {
      healthy = false;
      statusMessage = error?.message || 'Configuracao cadastrada, mas com erro ao obter token.';
    }

    const visibleWebhookSecret = await this.proofpointAuthService.getVisibleWebhookSecret();

    return {
      configured: true,
      healthy,
      status: healthy ? 'healthy' : 'error',
      clientId: await this.proofpointAuthService.getVisibleClientId(),
      webhookSecret: visibleWebhookSecret,
      hasClientId: true,
      hasClientSecret: true,
      hasWebhookSecret: Boolean(visibleWebhookSecret),
      tokenExpiresAt: cfg.tokenExpiresAt,
      statusMessage
    };
  }

  @Post()
  async saveProofpointConfig(@Body() dto: SaveProofpointConfigDto, @Req() req: any) {
    await this.proofpointAuthService.saveConfig(dto);

    await this.auditService.record({
      actorUserId: req?.user?.id,
      actorEmail: req?.user?.email,
      action: 'TOKEN_CREATE',
      entityType: 'ProofpointConfig',
      entityId: 'proofpoint_api',
      req,
      metadataJson: {
        changedClientId: Boolean(dto?.clientId),
        changedClientSecret: Boolean(dto?.clientSecret)
      }
    });

    return { ok: true };
  }

  @Post('test-token')
  async testProofpointToken(@Req() req: any) {
    const token = await this.proofpointAuthService.getValidBearerToken(true);

    await this.auditService.record({
      actorUserId: req?.user?.id,
      actorEmail: req?.user?.email,
      action: 'TOKEN_ROTATE',
      entityType: 'ProofpointConfig',
      entityId: 'proofpoint_api',
      req,
      metadataJson: {
        operation: 'test-token'
      }
    });

    return { ok: true, tokenPreview: `${token.slice(0, 12)}...` };
  }

  @Post('refresh-token')
  async refreshProofpointToken(@Req() req: any) {
    const token = await this.proofpointAuthService.getValidBearerToken(true);

    await this.auditService.record({
      actorUserId: req?.user?.id,
      actorEmail: req?.user?.email,
      action: 'TOKEN_ROTATE',
      entityType: 'ProofpointConfig',
      entityId: 'proofpoint_api',
      req,
      metadataJson: {
        operation: 'refresh-token'
      }
    });

    return { ok: true, tokenPreview: `${token.slice(0, 12)}...` };
  }

  @Post('reset-webhook')
  async resetWebhookSecret(@Req() req: any) {
    const result = await this.proofpointAuthService.resetWebhookSecret();

    await this.auditService.record({
      actorUserId: req?.user?.id,
      actorEmail: req?.user?.email,
      action: 'TOKEN_ROTATE',
      entityType: 'WebhookSecret',
      entityId: 'proofpoint_api',
      req,
      metadataJson: {
        operation: 'reset-webhook'
      }
    });

    return result;
  }

  @Delete()
  async deleteProofpointConfig(@Req() req: any) {
    const result = await this.proofpointAuthService.deleteConfig();

    await this.auditService.record({
      actorUserId: req?.user?.id,
      actorEmail: req?.user?.email,
      action: 'TOKEN_DELETE',
      entityType: 'ProofpointConfig',
      entityId: 'proofpoint_api',
      req,
      metadataJson: {
        deleted: result?.deleted
      }
    });

    return result;
  }
}