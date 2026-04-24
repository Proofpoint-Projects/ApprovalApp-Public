import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { SecretCryptoService } from './secret-crypto.service';

type EncryptedSecretShape = {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: string;
};

@Injectable()
export class ProofpointAuthService {
  private readonly authUrl =
    'https://app.us-east-1-op1.op.analyze.proofpoint.com/v2/apis/auth/oauth/token';


  constructor(
    private readonly prisma: PrismaService,
    private readonly secretCryptoService: SecretCryptoService
  ) {}

  private serializeEncrypted(value: EncryptedSecretShape): string {
    return JSON.stringify(value);
  }

  private deserializeEncrypted(value: string): EncryptedSecretShape {
    return JSON.parse(value) as EncryptedSecretShape;
  }

  async getConfig() {
    return this.prisma.proofpointApiConfig.findUnique({
      where: { provider: 'proofpoint_api' }
    });
  }

  async isConfigured() {
    const config = await this.getConfig();
    return Boolean(config?.clientIdEncrypted && config?.clientSecretEncrypted);
  }

  async getVisibleClientId() {
    const config = await this.getConfig();
    if (!config?.clientIdEncrypted) return null;

    return this.secretCryptoService.decrypt(
      this.deserializeEncrypted(config.clientIdEncrypted)
    );
  }

  async getVisibleWebhookSecret() {
    const config = await this.getConfig();
    if (!config?.webhookSecretEncrypted) return null;

    return this.secretCryptoService.decrypt(
      this.deserializeEncrypted(config.webhookSecretEncrypted)
    );
  }

  async resetWebhookSecret() {
    const config = await this.getConfig();

    if (!config) {
      throw new InternalServerErrorException('Configuracao da Proofpoint nao cadastrada.');
    }

    const webhookSecret = randomBytes(24).toString('hex');
    const webhookSecretEncrypted = this.serializeEncrypted(
      this.secretCryptoService.encrypt(webhookSecret) as EncryptedSecretShape
    );

    await this.prisma.proofpointApiConfig.update({
      where: { provider: 'proofpoint_api' },
      data: { webhookSecretEncrypted }
    });

    return { ok: true, webhookSharedSecret: webhookSecret };
  }

  async saveConfig(input: { clientId?: string; clientSecret?: string }) {
    const existing = await this.getConfig();

    const updateData: any = {};
    const createData: any = {
      provider: 'proofpoint_api'
    };

    if (input.clientId?.trim()) {
      const clientIdEncrypted = this.serializeEncrypted(
        this.secretCryptoService.encrypt(input.clientId.trim()) as EncryptedSecretShape
      );
      updateData.clientIdEncrypted = clientIdEncrypted;
      createData.clientIdEncrypted = clientIdEncrypted;
    } else if (existing?.clientIdEncrypted) {
      createData.clientIdEncrypted = existing.clientIdEncrypted;
    }

    if (input.clientSecret?.trim()) {
      const clientSecretEncrypted = this.serializeEncrypted(
        this.secretCryptoService.encrypt(input.clientSecret.trim()) as EncryptedSecretShape
      );
      updateData.clientSecretEncrypted = clientSecretEncrypted;
      createData.clientSecretEncrypted = clientSecretEncrypted;
    } else if (existing?.clientSecretEncrypted) {
      createData.clientSecretEncrypted = existing.clientSecretEncrypted;
    }

    if (!createData.clientIdEncrypted || !createData.clientSecretEncrypted) {
      throw new InternalServerErrorException(
        'Configuracao incompleta. Informe client_id e client_secret na primeira configuracao.'
      );
    }

    if (Object.keys(updateData).length > 0) {
      updateData.cachedTokenEncrypted = null;
      updateData.refreshTokenEncrypted = null;
      updateData.tokenExpiresAt = null;
    }

    return this.prisma.proofpointApiConfig.upsert({
      where: { provider: 'proofpoint_api' },
      update: updateData,
      create: createData
    });
  }

  async deleteConfig() {
    const config = await this.getConfig();
    if (!config) {
      return { ok: true, deleted: false };
    }

    await this.prisma.proofpointApiConfig.delete({
      where: { provider: 'proofpoint_api' }
    });

    return { ok: true, deleted: true };
  }

  private async requestClientCredentialsToken(clientId: string, clientSecret: string) {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
      scope: '*'
    });

    console.log('[proofpoint-auth] REQUEST POST', this.authUrl);
    console.log('[proofpoint-auth] REQUEST headers', JSON.stringify({
      accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    }));
    console.log(
      '[proofpoint-auth] REQUEST body',
      JSON.stringify({
        client_id: clientId,
        client_secret: '[REDACTED]',
        grant_type: 'client_credentials',
        scope: '*'
      })
    );

    const response = await fetch(this.authUrl, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    const text = await response.text();
    let json: any = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }

    console.log('[proofpoint-auth] RESPONSE status', response.status);
    console.log('[proofpoint-auth] RESPONSE body', JSON.stringify(json));

    if (!response.ok) {
      throw new InternalServerErrorException(
        `Erro ao gerar bearer token Proofpoint: ${response.status} ${JSON.stringify(json)}`
      );
    }

    return json;
  }

  private async requestRefreshToken(clientId: string, refreshToken: string) {
    const body = new URLSearchParams({
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    });

    console.log('[proofpoint-auth] REQUEST POST', this.authUrl);
    console.log('[proofpoint-auth] REQUEST headers', JSON.stringify({
      accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    }));
    console.log(
      '[proofpoint-auth] REQUEST body',
      JSON.stringify({
        client_id: clientId,
        grant_type: 'refresh_token',
        refresh_token: '[REDACTED]'
      })
    );

    const response = await fetch(this.authUrl, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    const text = await response.text();
    let json: any = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }

    console.log('[proofpoint-auth] RESPONSE status', response.status);
    console.log('[proofpoint-auth] RESPONSE body', JSON.stringify(json));

    if (!response.ok) {
      throw new Error(`refresh_failed: ${response.status} ${JSON.stringify(json)}`);
    }

    return json;
  }

  async getValidBearerToken(forceRefresh = false) {
    const config = await this.getConfig();

    if (!config?.clientIdEncrypted || !config?.clientSecretEncrypted) {
      throw new InternalServerErrorException('Configuracao da Proofpoint nao cadastrada.');
    }

    const skewSeconds = Number(process.env.PROOFPOINT_TOKEN_SKEW_SECONDS || '60');
    const now = new Date();

    if (
      !forceRefresh &&
      config.cachedTokenEncrypted &&
      config.tokenExpiresAt &&
      config.tokenExpiresAt.getTime() - now.getTime() > skewSeconds * 1000
    ) {
      console.log('[proofpoint-auth] reusando access token em cache ate', config.tokenExpiresAt.toISOString());
      return this.secretCryptoService.decrypt(
        this.deserializeEncrypted(config.cachedTokenEncrypted)
      );
    }

    const clientId = this.secretCryptoService.decrypt(
      this.deserializeEncrypted(config.clientIdEncrypted)
    );
    const clientSecret = this.secretCryptoService.decrypt(
      this.deserializeEncrypted(config.clientSecretEncrypted)
    );

    let tokenPayload: any = null;

    if (!forceRefresh && config.refreshTokenEncrypted) {
      try {
        const refreshToken = this.secretCryptoService.decrypt(
          this.deserializeEncrypted(config.refreshTokenEncrypted)
        );
        console.log('[proofpoint-auth] access token expirado; tentando refresh_token');
        tokenPayload = await this.requestRefreshToken(clientId, refreshToken);
      } catch (error: any) {
        console.log('[proofpoint-auth] refresh falhou; voltando para client_credentials', error?.message || error);
      }
    }

    if (!tokenPayload) {
      console.log('[proofpoint-auth] gerando novo token via client_credentials');
      tokenPayload = await this.requestClientCredentialsToken(clientId, clientSecret);
    }

    const accessToken = tokenPayload.access_token;
    const refreshToken = tokenPayload.refresh_token || null;
    const expiresIn = Number(tokenPayload.expires_in || 3600);

    if (!accessToken) {
      throw new InternalServerErrorException('Resposta da Proofpoint sem access_token.');
    }

    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    await this.prisma.proofpointApiConfig.update({
      where: { provider: 'proofpoint_api' },
      data: {
        cachedTokenEncrypted: this.serializeEncrypted(
          this.secretCryptoService.encrypt(accessToken) as EncryptedSecretShape
        ),
        refreshTokenEncrypted: refreshToken
          ? this.serializeEncrypted(
              this.secretCryptoService.encrypt(refreshToken) as EncryptedSecretShape
            )
          : config.refreshTokenEncrypted,
        tokenExpiresAt
      }
    });

    console.log('[proofpoint-auth] novo access token salvo; expira em', tokenExpiresAt.toISOString());

    return accessToken;
  }
}
