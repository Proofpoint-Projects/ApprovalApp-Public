import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { SecretCryptoService } from '../integrations/secret-crypto.service';
import { BootstrapSetupDto } from './dto/bootstrap-setup.dto';

type EncryptedSecretShape = {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: string;
};

@Injectable()
export class SetupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly secretCryptoService: SecretCryptoService
  ) {}

  private serializeEncrypted(value: EncryptedSecretShape): string {
    return JSON.stringify(value);
  }

  private generateWebhookSecret() {
    return randomBytes(24).toString('hex');
  }

  async getStatus() {
    const cfg = await this.prisma.proofpointApiConfig.findUnique({
      where: { provider: 'proofpoint_api' }
    });

    return {
      initialized: Boolean(cfg?.clientIdEncrypted && cfg?.clientSecretEncrypted),
      requiresSetup: !cfg?.clientIdEncrypted || !cfg?.clientSecretEncrypted
    };
  }

  async bootstrap(dto: BootstrapSetupDto) {
    const existing = await this.prisma.proofpointApiConfig.findUnique({
      where: { provider: 'proofpoint_api' }
    });

    const webhookSecret = dto.webhookSharedSecret?.trim() || this.generateWebhookSecret();

    const clientIdEncrypted = this.serializeEncrypted(
      this.secretCryptoService.encrypt(dto.clientId.trim()) as EncryptedSecretShape
    );
    const clientSecretEncrypted = this.serializeEncrypted(
      this.secretCryptoService.encrypt(dto.clientSecret.trim()) as EncryptedSecretShape
    );
    const webhookSecretEncrypted = this.serializeEncrypted(
      this.secretCryptoService.encrypt(webhookSecret) as EncryptedSecretShape
    );

    const saved = await this.prisma.proofpointApiConfig.upsert({
      where: { provider: 'proofpoint_api' },
      update: {
        clientIdEncrypted,
        clientSecretEncrypted,
        webhookSecretEncrypted,
        cachedTokenEncrypted: null,
        refreshTokenEncrypted: null,
        tokenExpiresAt: null
      },
      create: {
        provider: 'proofpoint_api',
        clientIdEncrypted,
        clientSecretEncrypted,
        webhookSecretEncrypted
      }
    });

    return {
      ok: true,
      initialized: true,
      webhookSharedSecret: webhookSecret,
      configId: saved.id,
      alreadyExisted: Boolean(existing)
    };
  }
}
