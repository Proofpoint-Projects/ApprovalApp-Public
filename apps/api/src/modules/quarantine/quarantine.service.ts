import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ProofpointAuthService } from '../integrations/proofpoint-auth.service';
import { ProofpointEmailEventsService } from '../integrations/proofpoint-email-events.service';
import { AuditService } from '../audit/audit.service';
import { ApprovalsService } from '../approvals/approvals.service';
import { PrismaService } from '../../prisma/prisma.service';

type PresetUnit = 'hours' | 'days' | 'weeks';
type RangeFilter = {
  preset?: '1h' | '24h' | '7d' | '30d' | 'custom';
  customValue?: number;
  customUnit?: PresetUnit;
};

@Injectable()
export class QuarantineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly proofpointEmailEventsService: ProofpointEmailEventsService,
    private readonly proofpointAuthService: ProofpointAuthService,
    private readonly auditService: AuditService,
    private readonly approvalsService: ApprovalsService
  ) {}


  private async getAllowedFoldersForUser(user: any): Promise<string[]> {
    if (!user?.id) {
      return [];
    }

    if (String(user?.role || '').toUpperCase() === 'ADMIN') {
      return [];
    }

    const scope = await this.prisma.approverQuarantineScope.findUnique({
      where: { userId: user.id }
    });

    if (!Array.isArray(scope?.foldersJson)) {
      return [];
    }

    return scope.foldersJson
      .map((value: any) => String(value || '').trim())
      .filter(Boolean);
  }

  async listMine(user: { id?: string; email: string; displayName?: string; role?: string }, filter?: RangeFilter) {
    console.log(
      '[quarantine] usuario solicitando fila',
      JSON.stringify(user),
      'filter',
      JSON.stringify(filter)
    );

    const configured = await this.proofpointAuthService.isConfigured();

    if (!configured) {
      console.log('[quarantine] proofpoint nao configurado ainda, retornando lista vazia');
      return {
        viewer: {
          displayName: user?.displayName || user?.email || '-',
          email: user?.email || '-'
        },
        total: 0,
        items: []
      };
    }

    const role = String(user?.role || '').toUpperCase();
    const allowedFolders = await this.getAllowedFoldersForUser(user);

    console.log(
      '[quarantine] allowed folders ->',
      JSON.stringify({
        userId: user?.id || null,
        email: user?.email || null,
        role,
        allowedFolders
      })
    );

    if (role !== 'ADMIN' && allowedFolders.length === 0) {
      console.log('[quarantine] approver sem pastas cadastradas, retornando lista vazia');
      return {
        viewer: {
          displayName: user?.displayName || user?.email || '-',
          email: user?.email || '-'
        },
        total: 0,
        items: []
      };
    }

    const result = await this.proofpointEmailEventsService.listEmailEvents(
      filter,
      role === 'ADMIN' ? [] : allowedFolders
    );

    return result;
  }

  async getByFqid(
    user: { id?: string; email: string; displayName?: string; role?: string },
    fqid: string
  ) {
    const normalizedFqid = String(fqid || '').trim();

    if (!normalizedFqid) {
      throw new NotFoundException('FQID nao informado.');
    }

    const configured = await this.proofpointAuthService.isConfigured();

    if (!configured) {
      throw new NotFoundException('Proofpoint nao configurado.');
    }

    const token = await this.proofpointAuthService.getValidBearerToken();

    const baseUrl =
      process.env.PROOFPOINT_API_BASE_URL ||
      'https://app.us-east-1-op1.op.analyze.proofpoint.com';

    const response = await fetch(
      `${baseUrl}/v2/apis/activity/events/${encodeURIComponent(normalizedFqid)}`,
      {
        method: 'GET',
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      throw new NotFoundException('Evento de e-mail nao encontrado.');
    }

    const raw = await response.json();
    const normalized = this.proofpointEmailEventsService.normalizeOneEmailEvent(raw);

    const role = String(user?.role || '').toUpperCase();

    if (role !== 'ADMIN') {
      const allowedFolders = await this.getAllowedFoldersForUser(user);

      if (!allowedFolders.length) {
        throw new NotFoundException('Evento de e-mail nao encontrado.');
      }

      const eventFolder = String(normalized?.folder || '').trim().toLowerCase();

      const hasAccess = allowedFolders
        .map((folder) => String(folder || '').trim().toLowerCase())
        .includes(eventFolder);

      if (!hasAccess) {
        throw new NotFoundException('Evento de e-mail nao encontrado.');
      }
    }

    return normalized;
  }

  async getOne(user: { email: string; displayName?: string }, itemId: string) {
    const result = await this.listMine(user, { preset: '30d' });
    const found = result.items.find((item: any) => item.id === itemId);
    if (!found) throw new NotFoundException('Evento de e-mail nao encontrado.');
    return found;
  }

  async approveOne(user: any, payload: { fqid: string; justification?: string; emailItem?: any }) {
    console.log(
      '[quarantine] approveOne start ->',
      JSON.stringify({
        fqid: payload?.fqid || null,
        justification: payload?.justification || null,
        hasEmailItem: Boolean(payload?.emailItem),
        emailItemSubject: payload?.emailItem?.subject || null
      })
    );

    console.log(
      '[quarantine] approveOne payload snapshot ->',
      JSON.stringify({
        fqid: payload?.fqid || null,
        hasEmailItem: Boolean(payload?.emailItem),
        emailItemId: payload?.emailItem?.id || null,
        emailItemFqid: payload?.emailItem?.fqid || null,
        emailItemSubject: payload?.emailItem?.subject || null
      })
    );

    const existing = await this.approvalsService.findEmailApprovalByExternalRef(payload.fqid);

    console.log(
      '[quarantine] existing approval ->',
      JSON.stringify(
        existing
          ? {
              id: existing.id,
              status: existing.status,
              externalRef: existing.externalRef
            }
          : null
      )
    );

    const result = await this.proofpointEmailEventsService.approveByFqid(
      payload.fqid,
      payload.justification
    );

    console.log('[quarantine] proofpoint patch ok ->', JSON.stringify({ fqid: payload.fqid }));

    if (payload.emailItem) {
      
      await this.approvalsService.createResolvedEmailApproval(
        {
          id: user?.id,
          email: user?.email
        },
        this.buildApprovalPayloadFromEmailItem(
          payload.emailItem,
          payload.justification,
          payload.fqid
        )
      );
      console.log('[quarantine] local approval created');
    } else {
      console.log('[quarantine] emailItem missing, skipping local approval creation');
    }

    await this.auditService.record({
      actorUserId: user?.id,
      actorEmail: user?.email,
      action: 'PROOFPOINT_EMAIL_APPROVE',
      entityType: 'proofpoint_email_event',
      entityId: payload.fqid,
      metadataJson: {
        fqid: payload.fqid,
        justification: payload.justification || '',
        mode: 'single'
      }
    });

    return { ok: true, fqid: payload.fqid, result };
  }

  async approveMany(user: any,items: { fqid: string; justification?: string; emailItem?: any }[]) { 
    const results = [];
    const skippedAlreadyApproved: string[] = [];

    for (const item of items || []) {
      try {
        const existing = await this.approvalsService.findEmailApprovalByExternalRef(item.fqid);

        if (existing?.status === 'APPROVED' || existing?.status === 'PENDING') {
          skippedAlreadyApproved.push(item.fqid);
          continue;
        }

        const result = await this.proofpointEmailEventsService.approveByFqid(
          item.fqid,
          item.justification
        );

        if (item.emailItem) {
          console.log(
            '[quarantine] salvando aprovacao resolvida (bulk)',
            JSON.stringify({
              fqid: item.fqid,
              subject: item.emailItem?.subject || null,
              previewJson: item.emailItem || null,
              payloadJson: item.emailItem?.rawEvent || item.emailItem || null
            })
          );
          await this.approvalsService.createResolvedEmailApproval(
            {
              id: user?.id,
              email: user?.email
            },
            this.buildApprovalPayloadFromEmailItem(
              item.emailItem,
              item.justification,
              item.fqid
            )
          );
        }

        await this.auditService.record({
          actorUserId: user?.id,
          actorEmail: user?.email,
          action: 'PROOFPOINT_EMAIL_APPROVE',
          entityType: 'proofpoint_email_event',
          entityId: item.fqid,
          metadataJson: {
            fqid: item.fqid,
            justification: item.justification || '',
            mode: 'bulk'
          }
        });

        results.push({ fqid: item.fqid, ok: true, result });
      } catch (error: any) {
        await this.auditService.record({
          actorUserId: user?.id,
          actorEmail: user?.email,
          action: 'PROOFPOINT_EMAIL_APPROVE_FAILED',
          entityType: 'proofpoint_email_event',
          entityId: item.fqid,
          metadataJson: {
            fqid: item.fqid,
            justification: item.justification || '',
            mode: 'bulk',
            error: error?.message || 'Erro desconhecido'
          }
        });

        results.push({
          fqid: item.fqid,
          ok: false,
          error: error?.message || 'Erro desconhecido'
        });
      }
    }

    return {
      ok: true,
      results,
      skippedAlreadyApproved
    };
  }

  private buildApprovalPayloadFromEmailItem(
    item: any,
    justification?: string,
    externalRefOverride?: string
  ) {
    const incidentReasonNames = Array.isArray(item?.incidentReasons)
      ? item.incidentReasons
          .map((reason: any) => String(reason?.name || '').trim())
          .filter(Boolean)
      : [];

    const incidentReasonDescriptions = Array.isArray(item?.incidentReasons)
      ? item.incidentReasons
          .map((reason: any) => String(reason?.alias || reason?.name || '').trim())
          .filter(Boolean)
      : [];

    console.log(
      '[quarantine] buildApprovalPayloadFromEmailItem',
      JSON.stringify({
        externalRef: externalRefOverride || item?.fqid || item?.id || null,
        subject: item?.subject || null,
        senderEmail: item?.senderEmail || null,
        requesterEmail: item?.userEmail || item?.senderEmail || null,
        previewJson: item || null,
        payloadJson: item?.rawEvent || item || null
      })
    );

    return {
      externalRef: String(externalRefOverride || item?.fqid || item?.id || ''),
      requesterEmail: item?.userEmail || item?.senderEmail || '-',
      requesterName: item?.userName || item?.senderDisplayName || '-',
      requesterExternalId: item?.userEmail || item?.senderEmail || undefined,
      policyName:
        incidentReasonNames.join(' | ') ||
        item?.incidentKind ||
        'Email Quarantine',
      policyReason:
        incidentReasonDescriptions.join(' | ') ||
        item?.incidentStatus ||
        '-',
      previewJson: item,
      payloadJson: item?.rawEvent || item,
      messageSubject: item?.subject || null,
      messageSender: item?.senderEmail || null,
      decidedComment: justification || ''
    };
  }
}
