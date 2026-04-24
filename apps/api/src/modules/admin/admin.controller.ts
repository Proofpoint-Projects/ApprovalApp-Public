import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PrismaService } from '../../prisma/prisma.service';


type AuditPeriod = '24h' | '7d' | '30d' | 'all';
type AuditType = 'all' | 'auth' | 'token' | 'approval' | 'quarantine' | 'config';

@Roles('ADMIN')
@Controller('admin')

export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('stats')
  async stats() {
    const totalAuditEvents = await this.prisma.auditLog.count();
    return { totalAuditEvents };
  }

  private buildPeriodStart(period?: AuditPeriod) {
    const now = new Date();

    if (period === '24h') {
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    if (period === '7d') {
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    if (period === '30d') {
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return null;
  }

  private buildTypeFilter(type?: AuditType) {
    switch (type) {
      case 'auth':
        return {
          in: ['LOGIN', 'LOGOUT']
        };

      case 'token':
        return {
          in: ['TOKEN_CREATE', 'TOKEN_ROTATE', 'TOKEN_DELETE']
        };

      case 'approval':
        return {
          in: ['APPROVE', 'DENY', 'BULK_APPROVE']
        };

      case 'quarantine':
        return {
          in: ['PROOFPOINT_EMAIL_APPROVE', 'PROOFPOINT_EMAIL_APPROVE_FAILED']
        };

      case 'config':
        return {
          in: ['TOKEN_CREATE', 'TOKEN_DELETE']
        };

      default:
        return undefined;
    }
  }

  @Get('audit')
  async audit(
    @Query('user') user?: string,
    @Query('period') period: AuditPeriod = '7d',
    @Query('type') type: AuditType = 'all'
  ) {
    const createdAtGte = this.buildPeriodStart(period);
    const actionFilter = this.buildTypeFilter(type);

    return this.prisma.auditLog.findMany({
      where: {
        ...(createdAtGte
          ? {
              createdAt: {
                gte: createdAtGte
              }
            }
          : {}),
        ...(actionFilter
          ? {
              action: actionFilter
            }
          : {}),
        ...(user
          ? {
              OR: [
                { actorEmail: { contains: user, mode: 'insensitive' } },
                { action: { contains: user, mode: 'insensitive' } },
                { entityType: { contains: user, mode: 'insensitive' } },
                { entityId: { contains: user, mode: 'insensitive' } }
              ]
            }
          : {})
      },
      orderBy: { createdAt: 'desc' },
      take: 300
    });
  }
}
