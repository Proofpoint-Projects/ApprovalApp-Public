import { Injectable, InternalServerErrorException, NotFoundException, ConflictException } from '@nestjs/common';
import {
  ActionType,
  ApprovalSource,
  ApprovalStatus,
  EndpointApprovalGrantStatus
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ProofpointRulerService } from '../integrations/proofpoint-ruler.service';

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly proofpointRulerService: ProofpointRulerService
  ) {}

  async list(filters: {
    source?: ApprovalSource;
    status?: ApprovalStatus;
    user?: string;
    approverId?: string;
  }) {
    return this.prisma.approvalItem.findMany({
      where: {
        source: filters.source,
        status: filters.status,
        approverId: filters.approverId,
        OR: filters.user
          ? [
              { requesterEmail: { contains: filters.user, mode: 'insensitive' } },
              { requesterName: { contains: filters.user, mode: 'insensitive' } },
              { deviceHostname: { contains: filters.user, mode: 'insensitive' } },
              { policyName: { contains: filters.user, mode: 'insensitive' } }
            ]
          : undefined
      },
      include: {
        approver: true,
        actions: { include: { actorUser: true }, orderBy: { createdAt: 'asc' } },
        endpointGrant: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createResolvedEmailApproval(
    actor: { id: string; email: string },
    normalized: {
      externalRef: string;
      requesterEmail: string;
      requesterName?: string;
      requesterExternalId?: string;
      policyName: string;
      policyReason: string;
      previewJson?: unknown;
      payloadJson: unknown;
      messageSubject?: string | null;
      messageSender?: string | null;
      decidedComment?: string;
    }
  ) {
    
    const existing = await this.prisma.approvalItem.findFirst({
      where: {
        source: ApprovalSource.EMAIL_QUARANTINE,
        externalRef: normalized.externalRef
      }
    });

    if (!normalized.externalRef) {
      throw new InternalServerErrorException(
        'externalRef não informado para aprovação'
      );
    }
    if (existing?.status === ApprovalStatus.APPROVED) {
      return existing;
    }
    
    this.auditPreviewDebug(normalized.previewJson);

    console.log(
      '[approvals] createResolvedEmailApproval payload',
      JSON.stringify({
        externalRef: normalized.externalRef,
        requesterEmail: normalized.requesterEmail,
        requesterName: normalized.requesterName || null,
        policyName: normalized.policyName,
        messageSubject: normalized.messageSubject || null,
        messageSender: normalized.messageSender || null
      })
    );

    
    const created = await this.prisma.$transaction(async (tx) => {
      const item = await tx.approvalItem.create({
        data: {
          source: ApprovalSource.EMAIL_QUARANTINE,
          status: ApprovalStatus.APPROVED,
          externalRef: normalized.externalRef,
          requesterEmail: normalized.requesterEmail,
          requesterName: normalized.requesterName,
          requesterExternalId: normalized.requesterExternalId,
          policyName: normalized.policyName,
          policyReason: normalized.policyReason,
          previewJson: normalized.previewJson as object | undefined,
          payloadJson: normalized.payloadJson as object,
          messageSubject: normalized.messageSubject ?? null,
          messageSender: normalized.messageSender ?? null,
          approverId: actor.id,
          decidedAt: new Date()
        }
      });

      
      await tx.approvalAction.create({
        data: {
          approvalItemId: item.id,
          actorUserId: actor.id,
          action: ActionType.APPROVE,
          comment: normalized.decidedComment || null,
          metadataJson: {
            source: ApprovalSource.EMAIL_QUARANTINE,
            externalRef: normalized.externalRef,
            requesterEmail: normalized.requesterEmail,
            requesterName: normalized.requesterName || null,
            policyName: normalized.policyName,
            policyReason: normalized.policyReason,
            messageSubject: normalized.messageSubject || null,
            messageSender: normalized.messageSender || null
          }
        }
      });

      return item;
    });

    await this.auditService.record({
      actorUserId: actor.id,
      actorEmail: actor.email,
      action: 'APPROVE',
      entityType: 'approval_item',
      entityId: created.id,
      metadataJson: {
        source: ApprovalSource.EMAIL_QUARANTINE,
        externalRef: normalized.externalRef,
        requesterEmail: normalized.requesterEmail,
        policyName: normalized.policyName,
        messageSubject: normalized.messageSubject || null,
        messageSender: normalized.messageSender || null,
        comment: normalized.decidedComment || null
      }
    });

    console.log(
      '[approvals] createResolvedEmailApproval created',
      JSON.stringify({
        id: created.id,
        externalRef: created.externalRef,
        source: created.source,
        status: created.status,
        approverId: created.approverId,
        decidedAt: created.decidedAt
      })
    );
    return created;
  }
  async getById(id: string) {
    const item = await this.prisma.approvalItem.findUnique({
      where: { id },
      include: {
        actions: { include: { actorUser: true }, orderBy: { createdAt: 'asc' } },
        approver: true,
        endpointGrant: true
      }
    });

    if (!item) {
      throw new NotFoundException('Item de aprovacao nao encontrado.');
    }

    return item;
  }

async findEmailApprovalByExternalRef(externalRef: string) {
  return this.prisma.approvalItem.findFirst({
    where: {
      source: ApprovalSource.EMAIL_QUARANTINE,
      externalRef,
      status: {
        in: [
          ApprovalStatus.PENDING,
          ApprovalStatus.APPROVED
        ]
      }
    },
    include: {
      approver: true,
      actions: { include: { actorUser: true }, orderBy: { createdAt: 'asc' } }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
}

async createFromWebhookNormalized(
  source: ApprovalSource,
  normalized: {
    requesterEmail: string;
    requesterName?: string;
    requesterExternalId?: string;
    deviceHostname?: string;
    policyName: string;
    policyReason: string;
    policyRuleIds?: string[];
    previewJson?: unknown;
    payloadJson: unknown;
    messageSubject?: string;
    messageSender?: string;
    externalRef?: string;
  }
) {
    if (source === ApprovalSource.EMAIL_QUARANTINE && normalized.externalRef) {
      const existing = await this.prisma.approvalItem.findFirst({
        where: {
          source: ApprovalSource.EMAIL_QUARANTINE,
          externalRef: normalized.externalRef
        }
      });

      if (existing?.status === ApprovalStatus.APPROVED) {
        throw new ConflictException('Essa mensagem já foi aprovada anteriormente.');
      }

      if (existing?.status === ApprovalStatus.PENDING) {
        throw new ConflictException('Essa mensagem já possui uma aprovação pendente.');
      }
    }

    return this.prisma.approvalItem.create({
      data: {
        source,
        status: ApprovalStatus.PENDING,
        requesterEmail: normalized.requesterEmail,
        requesterName: normalized.requesterName,
        requesterExternalId: normalized.requesterExternalId,
        deviceHostname: normalized.deviceHostname,
        policyName: normalized.policyName,
        policyReason: normalized.policyReason,
        previewJson: normalized.previewJson as object | undefined,
        payloadJson: normalized.payloadJson as object,
        messageSubject: normalized.messageSubject,
        messageSender: normalized.messageSender,
        externalRef: normalized.externalRef
      }
    });
  }

  private auditPreviewDebug(preview: any) {
    try {
      const resources = Array.isArray(preview?.resources) ? preview.resources : [];

      const simplified = {
        subject: preview?.subject,
        sender: preview?.senderEmail,
        resources: resources.map((r: any) => ({
          name: r?.name,
          displayName: r?.displayName,
          attachmentDisplayName: r?.attachmentDisplayName,
          kind: r?.kind,
          classificationBadges: r?.classificationBadges,
          indicators: (r?.linkedIndicators || []).map((i: any) => ({
            name: i?.name,
            type: i?.type,
            matches: i?.matches,
            objectKind: i?.objectKind
          }))
        }))
      };

      console.log('[APPROVAL DEBUG] previewJson resumo ->', JSON.stringify(simplified, null, 2));
    } catch (err) {
      console.log('[APPROVAL DEBUG] erro ao logar previewJson', err);
    }
  }

  private extractEndpointApprovalMetadata(item: any) {
    const preview = item?.previewJson || {};
    const policies = preview?.policies || {};
    const user = preview?.user || {};

    const resolvedPolicies: any[] = Array.isArray(preview?.resolvedPolicies)
      ? preview.resolvedPolicies
      : [];

    const ruleIds: string[] = Array.from(
      new Set(
        resolvedPolicies
          .map((policy: any) => String(policy?.ruleId || '').trim())
          .filter((ruleId: string) => Boolean(ruleId))
      )
    );

    
    const username = user?.username || item?.requesterName || null;

    const processingReasonsDetailed = Array.isArray(policies?.processingReasonsDetailed)
      ? policies.processingReasonsDetailed
      : [];

    return {
      ruleIds,
      username: username ? String(username).trim() : null,
      processingReasonsDetailed,
      resolvedPolicies
    };
  }

  async approve(
    id: string,
    actor: { id: string; email: string },
    input?: { comment?: string; durationHours?: number },
    requestMeta?: { ip?: string; userAgent?: string }
  ) {
    const item = await this.getById(id);

    if (item.status !== ApprovalStatus.PENDING) {
      return { ok: false, message: 'Item nao esta mais pendente.' };
    }

    const durationHours =
      input?.durationHours === 6
        ? 6
        : input?.durationHours === 1
          ? 1
          : input?.durationHours === 1 / 60
            ? 1 / 60
            : 1;
    let endpointPatchResult: any = null;
    let endpointGrantData: any = null;

    if (item.source === ApprovalSource.ENDPOINT_ITM || item.source === ApprovalSource.DLP) {
      const metadata = this.extractEndpointApprovalMetadata(item);

      if (!metadata.ruleIds.length) {
        throw new InternalServerErrorException(
          'Nao foi possivel aprovar: evento sem policies/ruleIds resolvidos.'
        );
      }

      if (!metadata.username) {
        throw new InternalServerErrorException(
          'Nao foi possivel aprovar: evento sem username.'
        );
      }

      endpointPatchResult =
        await this.proofpointRulerService.addUsernameToMultipleRulePredicates({
          ruleIds: metadata.ruleIds,
          username: metadata.username,
          controlUsername: 'pfpt-approval-user-control'
        });

      const now = new Date();

      const durationMinutes =
        durationHours < 1
          ? durationHours * 60
          : durationHours * 60;

      const removeAfterAt = new Date(
        now.getTime() + ((durationMinutes + 10) * 60 * 1000)
      );

      endpointGrantData = {
        approvalItemId: id,

        // mantém um ruleId principal para compatibilidade
        ruleId: metadata.ruleIds[0],

        // para multi-policy, não existe um único predicateId
        predicateId: null,

        username: metadata.username,
        controlUsername: 'pfpt-approval-user-control',
        durationHours,
        justification: input?.comment || null,
        approvedById: actor.id,
        expiresAt: new Date(now.getTime() + durationHours * 60 * 60 * 1000),
        removeAfterAt,
        status: EndpointApprovalGrantStatus.ACTIVE,
        metadataJson: {
          processingReasonsDetailed: metadata.processingReasonsDetailed,
          resolvedPolicies: metadata.resolvedPolicies,
          patchedRules: endpointPatchResult?.results || []
        }
      };
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const approvalItem = await tx.approvalItem.update({
        where: { id },
        data: {
          status: ApprovalStatus.APPROVED,
          approverId: actor.id,
          decidedAt: new Date()
        }
      });

      await tx.approvalAction.create({
        data: {
          approvalItemId: id,
          actorUserId: actor.id,
          action: ActionType.APPROVE,
          comment: input?.comment,
          metadataJson: {
            source: item.source,
            requesterEmail: item.requesterEmail,
            durationHours,
            endpointPatchResult
          }
        }
      });

      if (endpointGrantData) {
        await tx.endpointApprovalGrant.upsert({
          where: { approvalItemId: id },
          update: endpointGrantData,
          create: endpointGrantData
        });
      }

      return approvalItem;
    });

    await this.auditService.record({
      actorUserId: actor.id,
      actorEmail: actor.email,
      action: 'APPROVE',
      entityType: 'approval_item',
      entityId: id,
      ipAddress: requestMeta?.ip,
      userAgent: requestMeta?.userAgent,
      metadataJson: {
        source: item.source,
        requesterEmail: item.requesterEmail,
        policyName: item.policyName,
        comment: input?.comment,
        durationHours,
        endpointPatchResult
      }
    });

    return { ok: true, item: updated, endpointPatchResult };
  }

  async deny(
    id: string,
    actor: { id: string; email: string },
    input?: { comment?: string },
    requestMeta?: { ip?: string; userAgent?: string }
  ) {
    const item = await this.getById(id);

    if (item.status !== ApprovalStatus.PENDING) {
      return { ok: false, message: 'Item nao esta mais pendente.' };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.approvalItem.update({
        where: { id },
        data: {
          status: ApprovalStatus.DENIED,
          approverId: actor.id,
          decidedAt: new Date()
        }
      });

      await tx.approvalAction.create({
        data: {
          approvalItemId: id,
          actorUserId: actor.id,
          action: ActionType.DENY,
          comment: input?.comment,
          metadataJson: {
            source: item.source,
            requesterEmail: item.requesterEmail
          }
        }
      });
    });

    await this.auditService.record({
      actorUserId: actor.id,
      actorEmail: actor.email,
      action: 'DENY',
      entityType: 'approval_item',
      entityId: id,
      ipAddress: requestMeta?.ip,
      userAgent: requestMeta?.userAgent,
      metadataJson: {
        source: item.source,
        requesterEmail: item.requesterEmail,
        policyName: item.policyName,
        comment: input?.comment
      }
    });

    return { ok: true };
  }

  private isDatabaseRecoveryError(error: any) {
    const message = String(error?.message || '').toLowerCase();
    const code = String(error?.code || '');

    return (
      code === '57P03' ||
      message.includes('database system is in recovery mode') ||
      message.includes('database system is not yet accepting connections') ||
      message.includes('consistent recovery state has not been yet reached')
    );
  }

 async processExpiredEndpointApprovals() {
    let due: any[] = [];

    try {
      due = await this.prisma.endpointApprovalGrant.findMany({
        where: {
          status: EndpointApprovalGrantStatus.ACTIVE,
          removeAfterAt: { lte: new Date() }
        },
        include: {
          approvalItem: true
        },
        take: 20,
        orderBy: { removeAfterAt: 'asc' }
      });
    } catch (error: any) {
      if (this.isDatabaseRecoveryError(error)) {
        return { processed: 0, skipped: true, reason: 'db_recovery' };
      }

      throw error;
    }

    for (const grant of due) {
      try {
        const metadataJson = (grant?.metadataJson || {}) as any;
        const patchedRules = Array.isArray(metadataJson?.patchedRules)
          ? metadataJson.patchedRules
          : [];

        if (patchedRules.length) {
          for (const patched of patchedRules) {
            const predicateId = String(patched?.predicateId || '').trim();
            if (!predicateId) {
              continue;
            }

            await this.proofpointRulerService.removeUsernameFromPredicate({
              predicateId,
              username: grant.username,
              controlUsername: grant.controlUsername
            });
          }
        } else if (grant.predicateId) {
          // compatibilidade com grants antigos
          await this.proofpointRulerService.removeUsernameFromPredicate({
            predicateId: grant.predicateId,
            username: grant.username,
            controlUsername: grant.controlUsername
          });
        }

        await this.prisma.$transaction(async (tx) => {
          await tx.endpointApprovalGrant.update({
            where: { id: grant.id },
            data: {
              status: EndpointApprovalGrantStatus.REMOVED,
              removedAt: new Date(),
              lastError: null
            }
          });

          const approverId = grant.approvedById || grant.approvalItem.approverId;
          if (approverId) {
            await tx.approvalAction.create({
              data: {
                approvalItemId: grant.approvalItemId,
                actorUserId: approverId,
                action: ActionType.AUTO_REMOVE,
                comment: `Usuario removido automaticamente apos ${grant.durationHours}h de aprovacao.`,
                metadataJson: {
                  approvalItemId: grant.approvalItemId,
                  predicateId: grant.predicateId,
                  username: grant.username,
                  controlUsername: grant.controlUsername,
                  patchedRules
                }
              }
            });
          }
        });

        await this.auditService.record({
          actorUserId: grant.approvedById || null,
          actorEmail: grant.approvalItem?.requesterEmail || null,
          action: 'AUTO_REMOVE',
          entityType: 'endpoint_approval_grant',
          entityId: grant.id,
          metadataJson: {
            approvalItemId: grant.approvalItemId,
            predicateId: grant.predicateId,
            username: grant.username,
            controlUsername: grant.controlUsername,
            patchedRules
          }
        });
      } catch (error: any) {
        if (this.isDatabaseRecoveryError(error)) {
          throw error;
        }

        await this.prisma.endpointApprovalGrant.update({
          where: { id: grant.id },
         data: {
            status: EndpointApprovalGrantStatus.FAILED,
            lastError: error?.message || 'Erro ao remover usuario do predicate',
            metadataJson: {
              ...(grant.metadataJson || {}),
              lastFailure: {
                error: error?.message,
                at: new Date().toISOString()
              }
            }
          }
        });

        await this.auditService.record({
          actorUserId: grant.approvedById || null,
          actorEmail: grant.approvalItem?.requesterEmail || null,
          action: 'AUTO_REMOVE_FAILED',
          entityType: 'endpoint_approval_grant',
          entityId: grant.id,
          metadataJson: {
            approvalItemId: grant.approvalItemId,
            predicateId: grant.predicateId,
            username: grant.username,
            error: error?.message || 'Erro ao remover usuario do predicate'
          }
        });
      }
    }

    return { processed: due.length };
  }
}