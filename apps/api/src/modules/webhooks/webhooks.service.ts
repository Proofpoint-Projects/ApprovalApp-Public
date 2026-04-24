import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException
} from '@nestjs/common';
import { ApprovalSource, ApprovalStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalsService } from '../approvals/approvals.service';
import { ProofpointAuthService } from '../integrations/proofpoint-auth.service';
import { ProofpointRulerService } from '../integrations/proofpoint-ruler.service';


@Injectable()
export class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approvalsService: ApprovalsService,
    private readonly proofpointAuthService: ProofpointAuthService,
    private readonly proofpointRulerService: ProofpointRulerService
  ) {}

  private async verifyWebhookToken(headers: Record<string, string | string[] | undefined>) {
    const configured = await this.proofpointAuthService.getVisibleWebhookSecret();

    console.log('Token configurado ->', configured);
    if (!configured) {
      return true;
    }

    const received =
      headers['x-proofpoint-token'] ||
      headers['x-webhook-token'] ||
      headers['x-token-webhook'] ||
      headers.authorization ||
      headers.Authorization;

    const value = Array.isArray(received) ? received[0] : received;

    if (!value) {
      throw new UnauthorizedException('Webhook token ausente.');
    }

    const normalized = String(value).replace(/^Bearer\s+/i, '').trim();

    if (normalized !== String(configured).trim()) {
      throw new UnauthorizedException('Webhook token invalido.');
    }

    return true;
  }

  private getEventPayload(body: any) {
    if (!body || typeof body !== 'object') {
      return {};
    }

    if (body.event && typeof body.event === 'object') {
      return body.event;
    }

    if (body.payload && typeof body.payload === 'object') {
      return body.payload;
    }

    return body;
  }

  private extractCountFromMatches(matches: any): number | null {
    if (typeof matches === 'number') {
      return matches;
    }

    if (!Array.isArray(matches) || !matches.length) {
      return null;
    }

    for (const match of matches) {
      const count = match?.result?.stats?.count;
      if (typeof count === 'number') {
        return count;
      }
    }

    // Fallback: count snippets if available
    for (const match of matches) {
      const snippets = Array.isArray(match?.snippets) ? match.snippets : [];
      if (snippets.length) {
        return snippets.length;
      }
    }

    return null;
  }

  private normalizeIndicators(payload: any) {
    const indicators = Array.isArray(payload?.indicators) ? payload.indicators : [];

    const normalized = indicators.map((indicator: any) => {
      const rawMatches = Array.isArray(indicator?.matches) ? indicator.matches : [];

      const contentObjects = rawMatches
        .map((match: any) => ({
          id: match?.object?.id || null,
          name: match?.object?.name || null,
          kind: match?.object?.kind || null
        }))
        .filter((obj: any) => {
          const kind = String(obj?.kind || '').trim().toLowerCase();
          const name = String(obj?.name || '').trim();

          if (!kind) return false;
          if (!name) return false;

          return kind === 'file:content';
        });

      const referencedIndicatorIds = rawMatches
        .flatMap((match: any) => {
          const params = Array.isArray(match?.params) ? match.params : [];
          return params.map((param: any) => String(param?.value || '').trim()).filter(Boolean);
        });

      return {
        id: indicator?.id || null,
        name: indicator?.name || null,
        kind: indicator?.kind || null,
        matches:
          typeof indicator?.matches === 'number'
            ? indicator.matches
            : this.extractCountFromMatches(indicator?.matches),
        contentObjects,
        referencedIndicatorIds
      };
    });

    const byId = new Map<string, any>();
    for (const indicator of normalized) {
      const id = String(indicator?.id || '').trim();
      if (id) {
        byId.set(id, indicator);
      }
  }

  return normalized.map((indicator: any) => {
    const linkedIndicators = Array.isArray(indicator?.referencedIndicatorIds)
      ? indicator.referencedIndicatorIds
          .map((id: string) => byId.get(id))
          .filter(Boolean)
          .map((linked: any) => ({
            id: linked?.id || null,
            name: linked?.name || null,
            kind: linked?.kind || null,
            type: this.getIndicatorType(linked?.kind),
            matches: typeof linked?.matches === 'number' ? linked.matches : null
          }))
      : [];

    return {
      ...indicator,
      type: this.getIndicatorType(indicator?.kind),
      linkedIndicators
    };
  });
}

  private normalizeProcessingReasons(payload: any) {
    const actions = Array.isArray(payload?.processing?.actions) ? payload.processing.actions : [];

    const processingReasonsDetailed = actions.flatMap((action: any) => {
      const reasons = Array.isArray(action?.reasons) ? action.reasons : [];

      return reasons.map((reason: any) => ({
        id: reason?.id || null,
        kind: reason?.kind || null,
        trigger: reason?.trigger || null,
        actionKind: action?.kind || null,
        source: action?.channel || null
      }));
    });

    const processingReasonIds = processingReasonsDetailed
      .map((reason: any) => reason?.id)
      .filter(Boolean);

    const validProcessingReason =
      processingReasonsDetailed.find((reason: any) => {
        const kind = String(reason?.kind || '');
        return kind === 'pfpt:rule:action:reason:kind:rule';
      }) ||
      processingReasonsDetailed.find((reason: any) => {
        const kind = String(reason?.kind || '');
        return kind === 'pfpt:rule:action:reason:kind:rule:bulk';
      }) ||
      null;

    return {
      processingReasonIds,
      processingReasonsDetailed,
      validProcessingReason
    };
  }

  private normalizeIncident(payload: any) {
    const incident = payload?.incident || {};
    const reasons = Array.isArray(incident?.reasons) ? incident.reasons : [];
    const reasonIds = reasons.map((reason: any) => reason?.id).filter(Boolean);

    const reasonsDetailed = reasons.map((reason: any) => ({
      id: reason?.id || null,
      name: reason?.name || null,
      alias: reason?.alias || null,
      severity: reason?.severity || null,
      kind: reason?.kind || null
    }));

    return {
      id: incident?.id || null,
      kind: incident?.kind || null,
      name: incident?.name || null,
      description: incident?.description || null,
      status: incident?.status || null,
      severity: incident?.severity || null,
      reasonIds,
      reasonsDetailed
    };
  }

  private normalizeUser(payload: any) {
    const user = payload?.user || {};

    return {
      id: user?.id || null,
      email: user?.email || null,
      username: user?.username || user?.name || null,
      displayName: user?.displayName || user?.fullname || null
    };
  }

  private getActionTypeLabels(payload: any) {
    const categories = Array.isArray(payload?.activity?.categories) ? payload.activity.categories : [];
    const primaryCategory = String(payload?.activity?.primaryCategory || '').toLowerCase();

    const labels = new Set<string>();

    if (primaryCategory.includes('web:file:upload')) {
      labels.add('Web File Upload');
    }

    if (primaryCategory.includes('network:file:copy:in')) {
      labels.add('Copy to Network Drive');
    }

    if (primaryCategory.includes('network:file:copy:out')) {
      labels.add('Copy to Network Drive');
    }

    for (const category of categories) {
      const value = String(category || '').toLowerCase();

      if (value.includes('web:file:upload')) {
        labels.add('Web File Upload');
      }

      if (value.includes('network:file:copy:in')) {
        labels.add('Copy to Network Drive');
      }

      if (value.includes('network:file:copy:out')) {
        labels.add('Copy to Network Drive');
      }
    }

    return Array.from(labels);
  }

  private hasNetworkCopyActivity(payload: any) {
    const primaryCategory = String(payload?.activity?.primaryCategory || '').toLowerCase();
    const categories = Array.isArray(payload?.activity?.categories)
      ? payload.activity.categories
      : [];

    if (primaryCategory.includes('network:file:copy:in')) {
      return true;
    }

    return categories.some((category: any) =>
      String(category || '').toLowerCase().includes('network:file:copy:in')
    );
  }

  private inferTrackingForNetworkCopy(resources: any[], payload: any) {
    if (!this.hasNetworkCopyActivity(payload)) {
      return resources;
    }

    const sourceFile = resources.find(
      (resource: any) =>
        String(resource?.kind || '').toLowerCase() === 'file' &&
        resource?.target === false &&
        String(resource?.name || '').trim()
    );

    const targetResource = resources.find(
      (resource: any) =>
        String(resource?.kind || '').toLowerCase() === 'file' &&
        resource?.target === true
    );

    if (!sourceFile || !targetResource || sourceFile?.tracking) {
      return resources;
    }

    const targetPath =
      targetResource?._derivatives?.direction?.target?.path ||
      targetResource?.path ||
      null;

    const targetUrl = targetResource?.url || null;
    const targetAddresses = Array.isArray(targetResource?.addresses)
      ? targetResource.addresses
      : [];
    const targetId = targetResource?.id || null;

    return resources.map((resource: any) => {
      if (resource?.id !== sourceFile.id) {
        return resource;
      }

      return {
        ...resource,
        tracking: {
          sources: [
            {
              genesis: {
                kind: 'it:dev:network:file:copy:out',
                resource: {
                  path: targetUrl || targetPath,
                  addresses: targetAddresses,
                  id: targetId
                }
              },
              id: resource?.id || null,
              events: [payload?.event?.id || payload?.id].filter(Boolean),
              origin: targetId
            }
          ]
        },
        _derivatives: {
          ...(resource?._derivatives || {}),
          direction: {
            ...(resource?._derivatives?.direction || {}),
            source: {
              name:
                resource?._derivatives?.direction?.source?.name ||
                resource?.name ||
                null,
              path:
                resource?._derivatives?.direction?.source?.path ||
                resource?.path ||
                null
            },
            target: {
              name:
                targetResource?._derivatives?.direction?.target?.name ||
                targetResource?.name ||
                null,
              path: targetPath
            }
          }
        }
      };
    });
  }

  private normalizeResources(payload: any) {
    const resources = Array.isArray(payload?.resources) ? payload.resources : [];
    const application = payload?.process?.application || {};

    const normalizedResources = resources.map((resource: any) => ({
      id: resource?.id || null,
      kind: resource?.kind || null,
      name: resource?.name || null,
      path: resource?.path || null,
      url: resource?.url || null,
      host: resource?.host || null,
      target: resource?.target ?? null,
      extension: resource?.extension || null,
      size: resource?.size ?? null,
      contentType: resource?.contentType || null,
      addresses: Array.isArray(resource?.addresses) ? resource.addresses : [],
      hashes: Array.isArray(resource?.hashes) ? resource.hashes : [],
      tracking: resource?.tracking || null,
      applicationName: application?.name || null,
      applicationDescription: application?.description || null,
      applicationVendor: application?.vendor || null,
      _derivatives: resource?._derivatives || null
    }));

    return this.inferTrackingForNetworkCopy(normalizedResources, payload);
  }

  private async getRuleDetailsFromProcessingReason(processing: any) {
    const ruleId = processing?.validProcessingReason?.id;

    if (!ruleId) {
      return null;
    }

    try {
      const ruleJson = await this.proofpointRulerService.getRuleWithPredicate(String(ruleId));

      const details =
        ruleJson?.details ||
        ruleJson?.data?.details ||
        ruleJson?.rule?.details ||
        null;

      if (!details) {
        return null;
      }

      return {
        id: ruleId,
        name: details?.name || null,
        description: details?.description || null
      };
    } catch {
      return null;
    }
  }

  private normalizePolicyReason(input: {
    incident: any;
    payload: any;
    processing: any;
  }) {
    const incidentDescription = String(input?.incident?.description || '').trim();
    if (incidentDescription) {
      return incidentDescription;
    }

    const payloadReason = String(input?.payload?.reason || '').trim();
    if (payloadReason) {
      return payloadReason;
    }

    const payloadDetails = String(input?.payload?.details || '').trim();
    if (payloadDetails) {
      return payloadDetails;
    }

    const processingActionReason = (input?.processing?.processingReasonsDetailed || []).find(
      (reason: any) => String(reason?.actionKind || '').includes('prevention')
    );

    if (processingActionReason?.id) {
      return `Triggered by processing reason ${processingActionReason.id}`;
    }

    return 'Sem detalhe informado';
  }
  
  private normalizeRuleId(value: any): string | null {
  const raw = String(value || '').trim();
  if (!raw) return null;

  return raw.split(':')[0] || null;
}

  private extractPoliciesFromIndicators(
    payload: any
  ): Array<{ ruleId: string | null; policyName: string | null; source: 'indicator' }> {
    const indicators = Array.isArray(payload?.indicators) ? payload.indicators : [];

    const policies = indicators
      .filter((item: any) =>
        item?.kind === 'it:endpoint:prevention:rule' &&
        typeof item?.name === 'string' &&
        item.name.trim()
      )
      .map((item: any) => ({
        ruleId: this.normalizeRuleId(item?.id),
        policyName: String(item?.name || '').trim() || null,
        source: 'indicator' as const
      }))
      .filter((item: { ruleId: string | null; policyName: string | null; source: 'indicator' }) =>
        Boolean(item.ruleId || item.policyName)
      );

    const unique = new Map<string, any>();
    for (const item of policies) {
      const key = `${item.ruleId || ''}|${item.policyName || ''}|${item.source}`;
      if (!unique.has(key)) {
        unique.set(key, item);
      }
    }

    return Array.from(unique.values());
  }

  private async resolvePoliciesFromProcessing(
    payload: any
  ): Promise<Array<{ ruleId: string | null; policyName: string | null; source: 'processing' }>> {
    const blockingReasonIds = this.extractBlockingReasonIdsFromProcessing(payload);

    if (!blockingReasonIds.length) {
      return [];
    }

    const normalizedRuleIds = Array.from(
      new Set(blockingReasonIds.map((id) => this.normalizeRuleId(id)).filter(Boolean))
    );

    const results = await Promise.all(
      normalizedRuleIds.map(async (ruleId) => {
        try {
          const rule = await this.proofpointRulerService.getRuleWithPredicate(String(ruleId));

          const ruleDetails =
            rule?.details ||
            rule?.data?.details ||
            rule?.rule?.details ||
            null;

          return {
            ruleId: String(ruleId),
            policyName: rule?.name || ruleDetails?.name || null,
            source: 'processing' as const
          };
        } catch {
          return {
            ruleId: String(ruleId),
            policyName: null,
            source: 'processing' as const
          };
        }
      })
    );

    return results.filter(
      (item: { ruleId: string | null; policyName: string | null; source: 'processing' }) =>
        Boolean(item.ruleId || item.policyName)
    );
  }

  private async resolvePolicies(
    payload: any
  ): Promise<Array<{ ruleId: string | null; policyName: string | null; source: 'indicator' | 'processing' }>> {
    const fromIndicators = this.extractPoliciesFromIndicators(payload);

    if (fromIndicators.length) {
      return fromIndicators;
    }

    return this.resolvePoliciesFromProcessing(payload);
  }

  private getIndicatorType(kind?: string | null) {
    const normalized = String(kind || '').toLowerCase();

    if (normalized === 'smartid') return 'smartid';
    if (normalized === 'detector') return 'detector';
    if (normalized === 'dataset') return 'dataset';
    if (normalized === 'classifier' || normalized.includes('ai:classifier')) return 'classifier';
    if (normalized.includes('dictionary')) return 'dictionary';
    if (normalized.includes('idm')) return 'idm';
    if (normalized.includes('edm')) return 'edm';
    if (normalized.includes('mip')) return 'mip';

    return normalized || 'indicator';
  }

    private buildLinkedIndicators(resources: any[], indicators: any[]) {
    const normalizeValue = (value: any) =>
      String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\\/g, '/');

    const getFileNameFromPath = (value: any) => {
      const normalized = normalizeValue(value);
      if (!normalized) return '';
      const parts = normalized.split('/');
      return parts[parts.length - 1] || '';
    };

    return resources.map((resource: any) => {
      const candidateNames = Array.from(
        new Set(
          [
            resource?.name,
            resource?.id,
            resource?.path,
            resource?.url,
            resource?._derivatives?.direction?.source?.name,
            resource?._derivatives?.direction?.target?.name,
            resource?._derivatives?.direction?.source?.path,
            resource?._derivatives?.direction?.target?.path
          ]
            .map((value) => normalizeValue(value))
            .filter(Boolean)
            .flatMap((value) => [value, getFileNameFromPath(value)])
            .filter(Boolean)
        )
      );

      const linkedIndicators = indicators
        .filter((indicator: any) => {
          const contentObjects = Array.isArray(indicator?.contentObjects)
            ? indicator.contentObjects
            : [];

          return contentObjects.some((obj: any) => {
            const objectKind = normalizeValue(obj?.kind);
            const objectName = normalizeValue(obj?.name);
            const objectId = normalizeValue(obj?.id);

            if (objectKind !== 'file:content') {
              return false;
            }

            const objectCandidates = Array.from(
              new Set(
                [objectName, objectId]
                  .filter(Boolean)
                  .flatMap((value) => [value, getFileNameFromPath(value)])
                  .filter(Boolean)
              )
            );

            return objectCandidates.some((candidate) =>
              candidateNames.includes(candidate)
            );
          });
        })
        .map((indicator: any) => ({
          id: indicator?.id || null,
          name: indicator?.name || null,
          kind: indicator?.kind || null,
          type: this.getIndicatorType(indicator?.kind),
          matches: typeof indicator?.matches === 'number' ? indicator.matches : null
        }));

      console.log(
        '[webhook][linked-indicators-check]',
        JSON.stringify(
          {
            resource: {
              id: resource?.id || null,
              name: resource?.name || null,
              path: resource?.path || null
            },
            candidateNames,
            linkedIndicators
          },
          null,
          2
        )
      );

      return {
        ...resource,
        linkedIndicators
      };
    });
}

  private buildMergeKey(source: ApprovalSource, normalized: any) {
    const requester = String(normalized?.requesterEmail || '').trim().toLowerCase();
    const hostname = String(normalized?.deviceHostname || '').trim().toLowerCase();
    const occurredAt = String(normalized?.previewJson?.occurredAt || '').trim();
    const policyName = String(normalized?.policyName || '').trim().toLowerCase();

    if (!requester || !hostname || !occurredAt || !policyName) {
      return null;
    }

    return [source, requester, hostname, occurredAt, policyName].join('|');
  }

  private mergeUniqueBySignature(items: any[]) {
    const map = new Map<string, any>();

    for (const item of items) {
      const key = JSON.stringify({
        id: item?.id || null,
        kind: item?.kind || null,
        name: item?.name || null,
        path: item?.path || null,
        url: item?.url || null,
        host: item?.host || null,
        target: item?.target ?? null
      });

      if (!map.has(key)) {
        map.set(key, item);
      }
    }

    return Array.from(map.values());
  }

    private isBlockingAction(kind?: string) {
    if (!kind) return false;

    return (
      kind === 'it:rule:action:kind:prevention:syscall:block' ||
      kind.startsWith('it:rule:action:kind:prevention:')
    );
  }

  private extractBlockingReasonIdsFromProcessing(payload: any): string[] {
    const actions = Array.isArray(payload?.processing?.actions)
      ? payload.processing.actions
      : [];

    return actions
      .filter((action: any) => this.isBlockingAction(action?.kind))
      .flatMap((action: any) => Array.isArray(action?.reasons) ? action.reasons : [])
      .map((reason: any) => reason?.id)
      .filter(Boolean);
  }

  private mergeIndicators(items: any[]) {
    const map = new Map<string, any>();

    for (const item of items) {
      const key = JSON.stringify({
        id: item?.id || null,
        kind: item?.kind || null,
        name: item?.name || null
      });

      const currentContentObjects = Array.isArray(item?.contentObjects)
        ? item.contentObjects
        : [];

      if (!map.has(key)) {
        map.set(key, {
          ...item,
          contentObjects: this.mergeUniqueBySignature(
            currentContentObjects.map((obj: any) => ({
              id: obj?.id || null,
              kind: obj?.kind || null,
              name: obj?.name || null
            }))
          )
        });
        continue;
      }

      const existing = map.get(key);
      const existingMatches =
        typeof existing?.matches === 'number' ? existing.matches : 0;
      const newMatches =
        typeof item?.matches === 'number' ? item.matches : 0;

      const mergedContentObjects = this.mergeUniqueBySignature([
        ...(Array.isArray(existing?.contentObjects) ? existing.contentObjects : []),
        ...currentContentObjects
      ]).map((obj: any) => ({
        id: obj?.id || null,
        kind: obj?.kind || null,
        name: obj?.name || null
      }));

      map.set(key, {
        ...(newMatches > existingMatches ? { ...existing, ...item } : existing),
        matches: Math.max(existingMatches, newMatches),
        contentObjects: mergedContentObjects
      });
    }

    return Array.from(map.values());
  }

  private async mergeWithExistingPendingIfNeeded(source: ApprovalSource, normalized: any) {
    const mergeKey = this.buildMergeKey(source, normalized);
    const requesterEmail = String(normalized?.requesterEmail || '').trim();
  

    if (!mergeKey || !requesterEmail) {
      return null;
    }

    const candidates = await this.prisma.approvalItem.findMany({
      where: {
        source,
        status: ApprovalStatus.PENDING,
        requesterEmail
      },
      orderBy: { createdAt: 'desc' },
      take: 30
    });

    const existing = candidates.find((item: any) => {
      const preview = (item?.previewJson as any) || {};
      return preview?.mergeKey === mergeKey;
    });

    if (!existing) {
      return null;
    }

    const currentPreview = (existing?.previewJson as any) || {};
    const newPreview = normalized?.previewJson || {};

    const mergedResources = this.mergeUniqueBySignature([
      ...(Array.isArray(currentPreview?.resources) ? currentPreview.resources : []),
      ...(Array.isArray(newPreview?.resources) ? newPreview.resources : [])
    ]);

    const mergedScreenshots = this.mergeUniqueBySignature([
      ...(Array.isArray(currentPreview?.screenshots) ? currentPreview.screenshots : []),
      ...(Array.isArray(newPreview?.screenshots) ? newPreview.screenshots : [])
    ]);

    const mergedIndicators = this.mergeIndicators([
      ...(Array.isArray(currentPreview?.indicators) ? currentPreview.indicators : []),
      ...(Array.isArray(newPreview?.indicators) ? newPreview.indicators : [])
    ]);

    const mergedActionTypeLabels = Array.from(
      new Set([
        ...(Array.isArray(currentPreview?.actionTypeLabels) ? currentPreview.actionTypeLabels : []),
        ...(Array.isArray(newPreview?.actionTypeLabels) ? newPreview.actionTypeLabels : [])
      ].filter(Boolean))
    );

    const mergedPreview = {
      ...currentPreview,
      ...newPreview,
      resources: mergedResources,
      indicators: mergedIndicators,
      screenshots: mergedScreenshots,
      actionTypeLabels: mergedActionTypeLabels,
      mergeKey
    };

    return this.prisma.approvalItem.update({
      where: { id: existing.id },
      data: {
        previewJson: mergedPreview as object,
        payloadJson: normalized?.payloadJson as object,
        requesterName: normalized?.requesterName || existing.requesterName,
        requesterExternalId: normalized?.requesterExternalId || existing.requesterExternalId,
        deviceHostname: normalized?.deviceHostname || existing.deviceHostname,
        policyName: normalized?.policyName || existing.policyName,
        policyReason: normalized?.policyReason || existing.policyReason
      }
    });
  }

  private async normalizePayload(source: ApprovalSource, body: any) {
    const payload = this.getEventPayload(body);
    const processing = this.normalizeProcessingReasons(payload);
    const incident = this.normalizeIncident(payload);
    const indicators = this.normalizeIndicators(payload);
    const rawResources = this.normalizeResources(payload);
    const resources = this.buildLinkedIndicators(rawResources, indicators);
    const user = this.normalizeUser(payload);
    const actionTypeLabels = this.getActionTypeLabels(payload);
    const resolvedPolicies = await this.resolvePolicies(payload);
    const screenshots = await this.resolveScreenshotsFromPayload(payload);

    const requesterEmail =
      user.email ||
      payload?.actor?.email ||
      payload?.userEmail ||
      payload?.principal ||
      'unknown@proofpoint.local';

    const deviceHostname =
      payload?.endpoint?.hostname ||
      payload?.device?.hostname ||
      payload?.hostname ||
      null;

    const primaryPolicy = resolvedPolicies[0] || null;

    const policyName =
      primaryPolicy?.policyName ||
      payload?.policy?.name ||
      payload?.rule?.name ||
      'Unknown policy';

    const policyReason = this.normalizePolicyReason({
      incident,
      payload,
      processing
    });

    const previewJson: any = {
      summary: incident.description || payload?.details || null,
      occurredAt:
        payload?.event?.occurredAt ||
        payload?.occurredAt ||
        payload?.timestamp ||
        new Date().toISOString(),
      mergeKey: null as string | null,
      user,
      ruleDetails: primaryPolicy
        ? {
            id: primaryPolicy.ruleId,
            name: primaryPolicy.policyName,
            description: null
          }
        : null,
      resolvedPolicies,
      actionTypeLabels,
      policies: {
        processingReasonIds: processing.processingReasonIds,
        processingReasonsDetailed: processing.processingReasonsDetailed
      },
      incident,
      indicators,
      resources,
      screenshots,
      endpoint: {
        hostname: payload?.endpoint?.hostname || null,
        fqdn: payload?.endpoint?.fqdn || null,
        ip: payload?.endpoint?.location?.ip || null
      }
    };

    const normalized = {
      requesterEmail,
      requesterName: user.displayName || user.username || payload?.user?.name || null,
      requesterExternalId: user.id || null,
      deviceHostname,
      policyName,
      policyReason,
      policyRuleIds: resolvedPolicies.map((item: { ruleId: string | null }) => item.ruleId).filter((ruleId: string | null): ruleId is string => Boolean(ruleId)),
      previewJson,
      payloadJson: payload,
      messageSubject:
        source === ApprovalSource.EMAIL_QUARANTINE ? payload?.message?.subject || null : null,
      messageSender:
        source === ApprovalSource.EMAIL_QUARANTINE ? payload?.message?.sender || null : null
    };

    previewJson.mergeKey = this.buildMergeKey(source, normalized);

    return normalized;
  }

    private getScreenshotStorageDir() {
    return process.env.SCREENSHOTS_DIR || '/app/apps/api/storage/screenshots';
  }

  private sanitizeFileName(value: string) {
    return String(value || '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_');
  }

  private async ensureScreenshotDir() {
    await mkdir(this.getScreenshotStorageDir(), { recursive: true });
  }

  private getUiScreenshotReferences(payload: any) {
    const fqid = String(payload?.fqid || '').trim();

    const uiScreenshots = Array.isArray(payload?.ui?.screenshots) ? payload.ui.screenshots : [];
    const uiWindows = Array.isArray(payload?.ui?.windows) ? payload.ui.windows : [];

    const screenshotIds = uiScreenshots
      .map((item: any) => String(item?.id || '').trim())
      .filter(Boolean);

    const windowScreenshotIds = uiWindows
      .map((windowItem: any) => String(windowItem?.screenshot?.id || '').trim())
      .filter(Boolean);

    const ids = Array.from(new Set([...screenshotIds, ...windowScreenshotIds]));

    return {
      fqid: fqid || null,
      screenshotIds: ids,
      uiWindows,
      uiScreenshots
    };
  }

  private async fetchEventWithScreenshots(fqid: string) {
    const token = await this.proofpointAuthService.getValidBearerToken();

    const baseUrl =
      process.env.PROOFPOINT_API_BASE_URL ||
      'https://app.us-east-1-op1.op.analyze.proofpoint.com';

    const response = await fetch(
      `${baseUrl}/v2/apis/activity/events/${encodeURIComponent(fqid)}?includes=screenshots`,
      {
        method: 'GET',
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Falha ao buscar screenshots do evento. HTTP ${response.status}`);
    }

    return response.json();
  }

  private async downloadScreenshotFile(url: string, fileName: string) {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Falha ao baixar screenshot. HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await this.ensureScreenshotDir();

    const safeFileName = this.sanitizeFileName(fileName);
    const fullPath = join(this.getScreenshotStorageDir(), safeFileName);

    await writeFile(fullPath, buffer);

    return {
      localPath: fullPath,
      publicUrl: `/api/screenshots/${safeFileName}`,
      fileName: safeFileName
    };
  }

  private async resolveScreenshotsFromPayload(payload: any) {
    const uiRefs = this.getUiScreenshotReferences(payload);

    if (!uiRefs.fqid || !uiRefs.screenshotIds.length) {
      return [];
    }

    try {
      const eventWithScreenshots = await this.fetchEventWithScreenshots(uiRefs.fqid);

      const screenshots = Array.isArray(eventWithScreenshots?.ui?.screenshots)
        ? eventWithScreenshots.ui.screenshots
        : [];

      const windows = Array.isArray(eventWithScreenshots?.ui?.windows)
        ? eventWithScreenshots.ui.windows
        : [];

      const application = payload?.process?.application || {};
      const results: any[] = [];

      for (const screenshotId of uiRefs.screenshotIds) {
        const screenshot = screenshots.find(
          (item: any) => String(item?.id || '').trim() === screenshotId
        );

        if (!screenshot) {
          continue;
        }

        const href = screenshot?.links?.access?.href;
        if (!href) {
          continue;
        }

        const relatedWindow =
          windows.find(
            (windowItem: any) =>
              String(windowItem?.screenshot?.id || '').trim() === screenshotId
          ) || null;

        const originalFileName =
          String(screenshot?.file || '').trim() || `${screenshotId}.jpeg`;

        const downloaded = await this.downloadScreenshotFile(href, originalFileName);

        results.push({
          id: screenshotId,
          fqid: uiRefs.fqid,
          fileName: downloaded.fileName,
          localPath: downloaded.localPath,
          publicUrl: downloaded.publicUrl,
          width: screenshot?.w ?? null,
          height: screenshot?.h ?? null,
          x: screenshot?.x ?? null,
          y: screenshot?.y ?? null,
          size: screenshot?.size ?? null,
          windowTitle: relatedWindow?.title || null,
          applicationName: application?.name || null,
          applicationDescription: application?.description || null,
          applicationVendor: application?.vendor || null
        });
      }

      return results;
    } catch (error) {
      console.error('[webhook][screenshots] erro ao resolver screenshots', error);
      return [];
    }
  }

  async handle(
    source: ApprovalSource,
    body: any,
    _rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>
  ) {
    const signatureValid = await this.verifyWebhookToken(headers);
    const payload = this.getEventPayload(body);

    const eventId = String(
      headers['x-proofpoint-event-id'] ||
        payload?.id ||
        body?.id ||
        randomUUID()
    );

    const existingWebhook = await this.prisma.webhookEvent.findUnique({
      where: { eventId }
    });

    if (existingWebhook) {
      return {
        ok: true,
        duplicate: true,
        eventId,
        webhookEventId: existingWebhook.id
      };
    }

    console.log('[webhook][raw-body]', JSON.stringify(body, null, 2));

    const webhookEvent = await this.prisma.webhookEvent.create({
      data: {
        eventId,
        source,
        rawPayload: body as object,
        signatureValid,
        status: 'RECEIVED'
      }
    });

    try {
      const normalized = await this.normalizePayload(source, body);
      
      //BLOQUEIO: evento sem ruleDetails válido
      if (!Array.isArray(normalized?.previewJson?.resolvedPolicies) || !normalized.previewJson.resolvedPolicies.length) {
        console.log('[webhook][ignored] sem policies resolvidas');

        await this.prisma.webhookEvent.update({
          where: { id: webhookEvent.id },
          data: {
            status: 'IGNORED',
            processedAt: new Date(),
            normalizedPayload: {
              reason: 'Sem policies resolvidas'
            } as object
          }
        });

        return {
          ok: true,
          ignored: true,
          reason: 'Sem policies resolvidas'
        };
      }
      console.log('[webhook][normalized]', JSON.stringify(normalized, null, 2));

      const merged = await this.mergeWithExistingPendingIfNeeded(source, normalized);

      const approvalItem = merged
        ? merged
        : await this.approvalsService.createFromWebhookNormalized(source, normalized);

      await this.prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          normalizedPayload: normalized as object,
          status: 'PROCESSED',
          processedAt: new Date()
        }
      });

      return {
        ok: true,
        eventId,
        webhookEventId: webhookEvent.id,
        approvalItemId: approvalItem.id,
        merged: Boolean(merged)
      };
    } catch (error: any) {
      await this.prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          status: 'ERROR',
          processedAt: new Date(),
          normalizedPayload: {
            error: error?.message || 'Erro ao processar webhook'
          } as object
        }
      });

      throw new InternalServerErrorException(
        error?.message || 'Erro ao processar webhook'
      );
    }
  }
}