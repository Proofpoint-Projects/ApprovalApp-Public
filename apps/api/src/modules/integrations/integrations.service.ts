import { Injectable, NotFoundException } from '@nestjs/common';
import { SecretProvider, SecretStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateProofpointTokenDto, RotateProofpointTokenDto } from './integrations.dto';
import { SecretCryptoService } from './secret-crypto.service';

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly cryptoService: SecretCryptoService
  ) {}

  async listProofpointTokens() {
    const rows = await this.prisma.integrationSecret.findMany({
      where: { provider: SecretProvider.PROOFPOINT },
      orderBy: { updatedAt: 'desc' }
    });

    return rows.map((row) => ({
      id: row.id,
      integrationKey: row.integrationKey,
      displayName: row.displayName,
      baseUrl: row.baseUrl,
      enabled: row.enabled,
      status: row.status,
      maskedToken: `************${row.tokenLast4}`,
      fingerprintSha256: row.fingerprintSha256,
      keyVersion: row.keyVersion,
      notes: row.notes,
      updatedAt: row.updatedAt,
      createdAt: row.createdAt
    }));
  }

  async createProofpointToken(dto: CreateProofpointTokenDto, actor: { id?: string; email?: string }, requestMeta?: { ip?: string; userAgent?: string }) {
    const encrypted = this.cryptoService.encrypt(dto.bearerToken);

    const row = await this.prisma.integrationSecret.create({
      data: {
        provider: SecretProvider.PROOFPOINT,
        integrationKey: dto.integrationKey,
        displayName: dto.displayName,
        baseUrl: dto.baseUrl,
        tokenCiphertext: encrypted.ciphertext,
        tokenIv: encrypted.iv,
        tokenAuthTag: encrypted.authTag,
        tokenLast4: encrypted.tokenLast4,
        fingerprintSha256: encrypted.fingerprintSha256,
        keyVersion: encrypted.keyVersion,
        enabled: dto.enabled ?? true,
        status: dto.enabled === false ? SecretStatus.INACTIVE : SecretStatus.ACTIVE,
        notes: dto.notes,
        createdById: actor.id,
        updatedById: actor.id
      }
    });

    await this.auditService.record({
      actorUserId: actor.id,
      actorEmail: actor.email,
      action: 'TOKEN_CREATE',
      entityType: 'integration_secret',
      entityId: row.id,
      ipAddress: requestMeta?.ip,
      userAgent: requestMeta?.userAgent,
      metadataJson: {
        provider: 'PROOFPOINT',
        integrationKey: dto.integrationKey,
        baseUrl: dto.baseUrl,
        tokenLast4: encrypted.tokenLast4
      }
    });

    return { ok: true, id: row.id };
  }

  async rotateProofpointToken(id: string, dto: RotateProofpointTokenDto, actor: { id?: string; email?: string }, requestMeta?: { ip?: string; userAgent?: string }) {
    const current = await this.prisma.integrationSecret.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundException('Token configurado nao encontrado.');
    }

    const encrypted = this.cryptoService.encrypt(dto.bearerToken);

    await this.prisma.integrationSecret.update({
      where: { id },
      data: {
        tokenCiphertext: encrypted.ciphertext,
        tokenIv: encrypted.iv,
        tokenAuthTag: encrypted.authTag,
        tokenLast4: encrypted.tokenLast4,
        fingerprintSha256: encrypted.fingerprintSha256,
        keyVersion: encrypted.keyVersion,
        notes: dto.notes ?? current.notes,
        updatedById: actor.id,
        status: SecretStatus.ACTIVE,
        enabled: true
      }
    });

    await this.auditService.record({
      actorUserId: actor.id,
      actorEmail: actor.email,
      action: 'TOKEN_ROTATE',
      entityType: 'integration_secret',
      entityId: id,
      ipAddress: requestMeta?.ip,
      userAgent: requestMeta?.userAgent,
      metadataJson: {
        integrationKey: current.integrationKey,
        tokenLast4: encrypted.tokenLast4
      }
    });

    return { ok: true };
  }

  async disableProofpointToken(id: string, actor: { id?: string; email?: string }, requestMeta?: { ip?: string; userAgent?: string }) {
    const row = await this.prisma.integrationSecret.update({
      where: { id },
      data: {
        enabled: false,
        status: SecretStatus.INACTIVE,
        updatedById: actor.id
      }
    });

    await this.auditService.record({
      actorUserId: actor.id,
      actorEmail: actor.email,
      action: 'TOKEN_DISABLE',
      entityType: 'integration_secret',
      entityId: id,
      ipAddress: requestMeta?.ip,
      userAgent: requestMeta?.userAgent,
      metadataJson: { integrationKey: row.integrationKey }
    });

    return { ok: true };
  }

  async resolveProofpointSecret(integrationKey: string) {
    const row = await this.prisma.integrationSecret.findUnique({ where: { integrationKey } });
    if (!row || !row.enabled || row.status !== SecretStatus.ACTIVE) {
      throw new NotFoundException(`Nao existe token ativo para a integracao ${integrationKey}.`);
    }

    const bearerToken = this.cryptoService.decrypt({
      ciphertext: row.tokenCiphertext,
      iv: row.tokenIv,
      authTag: row.tokenAuthTag,
      keyVersion: row.keyVersion
    });

    return {
      id: row.id,
      integrationKey: row.integrationKey,
      baseUrl: row.baseUrl,
      bearerToken
    };
  }
}
