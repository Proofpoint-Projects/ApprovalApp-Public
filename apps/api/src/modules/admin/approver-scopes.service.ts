import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ApproverScopesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  private normalizeFolders(folders?: string[]) {
    return Array.from(
      new Set(
        (folders || [])
          .map((value) => String(value || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }

  async listApproversWithScopes() {
    const users = await this.prisma.user.findMany({
      where: {
        role: {
          in: ['APPROVER']
        }
      },
      include: {
        approverQuarantineScope: true
      },
      orderBy: [{ displayName: 'asc' }, { email: 'asc' }]
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      groupsJson: user.groupsJson,
      folders: Array.isArray(user.approverQuarantineScope?.foldersJson)
        ? (user.approverQuarantineScope?.foldersJson as string[])
        : []
    }));
  }

  async saveScopeByEmail(
    actor: { id?: string; email?: string },
    email: string,
    folders: string[],
    requestMeta?: { ip?: string; userAgent?: string }
  ) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedFolders = this.normalizeFolders(folders);

    const user = await this.prisma.user.findFirst({
      where: {
        email: normalizedEmail
      },
      include: {
        approverQuarantineScope: true
      }
    });

    if (!user) {
      throw new Error('Usuário não encontrado.');
    }

    const beforeFolders = Array.isArray(user.approverQuarantineScope?.foldersJson)
      ? (user.approverQuarantineScope.foldersJson as string[]).map((value) => String(value))
      : [];

    const saved = await this.prisma.approverQuarantineScope.upsert({
      where: {
        userId: user.id
      },
      create: {
        userId: user.id,
        foldersJson: normalizedFolders
      },
      update: {
        foldersJson: normalizedFolders
      }
    });

    await this.auditService.record({
      actorUserId: actor?.id || null,
      actorEmail: actor?.email || null,
      action: 'APPROVER_SCOPE_SAVE',
      entityType: 'approver_quarantine_scope',
      entityId: saved.id,
      ipAddress: requestMeta?.ip,
      userAgent: requestMeta?.userAgent,
      metadataJson: {
        targetUserId: user.id,
        targetUserEmail: user.email,
        targetUserDisplayName: user.displayName,
        beforeFolders,
        afterFolders: normalizedFolders
      }
    });

    return saved;
  }
}