import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(params: {
    actorUserId?: string | null;
    actorEmail?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    req?: any;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadataJson?: any;
  }) {
    const req = params.req;
    const forwardedFor = req?.headers?.['x-forwarded-for'];
    const derivedIp =
      (Array.isArray(forwardedFor) ? forwardedFor[0] : String(forwardedFor || '').split(',')[0].trim()) ||
      req?.ip ||
      req?.socket?.remoteAddress ||
      null;

    const derivedUserAgent = req?.headers?.['user-agent'] || null;

    return this.prisma.auditLog.create({
      data: {
        actorUserId: params.actorUserId || null,
        actorEmail: params.actorEmail || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        ipAddress: params.ipAddress || derivedIp || null,
        userAgent: params.userAgent || derivedUserAgent || null,
        metadataJson: params.metadataJson ?? null
      }
    });
  }
}
