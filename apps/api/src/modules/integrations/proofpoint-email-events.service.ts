import { Injectable, Logger } from '@nestjs/common';
import { ProofpointAuthService } from './proofpoint-auth.service';

type PresetType = '1h' | '24h' | '7d' | '30d' | 'custom';
type CustomUnit = 'minutes' | 'hours' | 'days' | 'weeks';

export type RangeFilter = {
  preset?: PresetType;
  customValue?: number;
  customUnit?: CustomUnit;
};

type NormalizedDetector = {
  id: string;
  name: string;
  kind: string;
  type: 'detector';
};

type NormalizedIndicator = {
  id: string;
  name: string;
  kind: string;
  type: string;
  matches: number;
  objectId?: string;
  objectName?: string;
  objectKind?: string;
  snippetValue?: string;
};

type ResourceBadge = {
  label: string;
  type: string;
  rawKind: string;
};

type GroupedResource = {
  id: string;
  name: string;
  kind: string;
  locations: string[];
  classificationBadges: ResourceBadge[];
  linkedIndicators: NormalizedIndicator[];
  matchedFromKinds: string[];
  analysisObjectId?: string;
  displayName?: string;
  attachmentId?: string;
  attachmentDisplayName?: string;
  resourceDisplayCategory?: string;
};


@Injectable()
export class ProofpointEmailEventsService {
  private readonly logger = new Logger(ProofpointEmailEventsService.name);

  private readonly baseUrl =
    'https://app.us-east-1-op1.op.analyze.proofpoint.com/v2/apis/activity';

  constructor(private readonly proofpointAuthService: ProofpointAuthService) {}

  private getRelativeMillis(filter?: RangeFilter) {
    const preset = filter?.preset || '30d';

    if (preset === '1h') return -1 * 60 * 60 * 1000;
    if (preset === '24h') return -24 * 60 * 60 * 1000;
    if (preset === '7d') return -7 * 24 * 60 * 60 * 1000;
    if (preset === '30d') return -30 * 24 * 60 * 60 * 1000;

    const rawValue = Number(filter?.customValue || 1);
    const value = Number.isFinite(rawValue) && rawValue > 0 ? rawValue : 1;
    const unit = filter?.customUnit || 'days';

    const multipliers: Record<CustomUnit, number> = {
      minutes: 60 * 1000,
      hours: 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000,
      weeks: 7 * 24 * 60 * 60 * 1000
    };

    return -1 * value * multipliers[unit];
  }

  private formatSeverity(value?: string) {
    const raw = String(value || '').toLowerCase();

    if (!raw) return '-';
    if (raw.includes(':critical')) return 'critical';
    if (raw.includes(':high')) return 'high';
    if (raw.includes(':medium')) return 'medium';
    if (raw.includes(':low')) return 'low';

    const parts = raw.split(':').filter(Boolean);
    return parts[parts.length - 1] || raw;
  }

  private formatIncidentStatus(value?: string) {
    const raw = String(value || '');
    if (!raw) return '-';

    const parts = raw.split(':').filter(Boolean);
    const last = parts[parts.length - 1] || raw;
    return last.charAt(0).toUpperCase() + last.slice(1);
  }

  private formatIncidentKind(value?: string) {
    const raw = String(value || '').toLowerCase();
    if (!raw) return '-';

    if (raw === 'pfpt:incident:general:data:violation') {
      return 'Data Violation Incident';
    }

    const parts = String(value).split(':').filter(Boolean);
    const last = String(parts[parts.length - 1] || value || '');
    return last
      .split(/[-_]/g)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private formatResourceLocation(kind?: string) {
    const raw = String(kind || '').toLowerCase();

    if (!raw) return '-';
    if (raw === 'file') return 'Arquivo';
    if (raw === 'email:file') return 'Anexo do e-mail';
    if (raw === 'email:body') return 'Corpo do e-mail';
    if (raw === 'email:subject') return 'Assunto do e-mail';
    if (raw === 'email:metadata') return 'Metadados do e-mail';
    if (raw === 'message:file') return 'Arquivo';
    if (raw === 'message:body') return 'Corpo do e-mail';
    if (raw === 'message:subject') return 'Assunto do e-mail';
    if (raw === 'message:metadata') return 'Metadados do e-mail';
    if (raw === 'file:content') return 'Arquivo analisado';

    return String(kind);
  }

  private getIndicatorType(kind?: string, fallbackOp?: string, indicatorName?: string) {
    const rawKind = String(kind || '').toLowerCase();
    const rawOp = String(fallbackOp || '').toLowerCase();
    const rawName = String(indicatorName || '').toLowerCase();

    if (rawKind === 'classification' && rawName === 'label') return 'classification';
    if (rawOp === 'smartid') return 'smartid';
    if (rawOp === 'dictionary') return 'dictionary';
    if (rawOp === 'classifier') return 'classifier';
    if (rawOp === 'dataset') return 'dataset';
    if (rawOp === 'fileset') return 'fileset';
    if (rawOp === 'idm') return 'idm';
    if (rawOp === 'edm') return 'edm';
    if (rawOp === 'mip') return 'mip';

    if (rawKind === 'detector' || rawKind.includes('detector')) return 'detector';
    if (rawKind === 'classification') return 'classification';

    if (rawKind.includes('pfpt:indicator:smartid') || rawKind.includes('smartid')) return 'smartid';
    if (rawKind.includes('pfpt:indicator:classifier') || rawKind.includes('classifier')) return 'classifier';
    if (rawKind.includes('pfpt:indicator:dictionary') || rawKind.includes('dictionary')) return 'dictionary';
    if (rawKind.includes('pfpt:indicator:dataset') || rawKind.includes('dataset')) return 'dataset';
    if (rawKind.includes('pfpt:indicator:fileset') || rawKind.includes('fileset')) return 'fileset';
    if (rawKind.includes('idm')) return 'idm';
    if (rawKind.includes('edm')) return 'edm';
    if (rawKind.includes('mip')) return 'mip';

    return rawKind || rawOp || 'indicator';
  }
  
 

  private normalizeDetectors(item: any): NormalizedDetector[] {
    const indicators = Array.isArray(item?.indicators) ? item.indicators : [];

    return indicators
      .filter((indicator: any) => String(indicator?.kind || '').toLowerCase() === 'detector')
      .map((indicator: any) => ({
        id: String(indicator?.id || indicator?.name || 'detector'),
        name: String(indicator?.name || '-'),
        kind: String(indicator?.kind || 'Detector'),
        type: 'detector' as const
      }));
  }


  private cleanAnalysisObjectId(value?: string) {
    const raw = String(value || '').trim();
    if (!raw) return '';

    const withoutResourceSuffix = raw.includes('-<') ? raw.split('-<')[0] : raw;
    return withoutResourceSuffix.trim().toLowerCase();
  }

  private isGenericResourceDisplayName(value?: string) {
    const raw = String(value || '').trim().toLowerCase();
    return raw === 'file' || raw === 'subject' || raw === 'metadata' || raw === 'body';
  }

  private createGroupedResource(params: {
    id: string;
    name: string;
    kind: string;
    attachmentId?: string;
    analysisObjectId?: string;
  }): GroupedResource {
    return {
      id: params.id,
      name: params.name,
      displayName: params.name,
      kind: params.kind,
      locations: [this.formatResourceLocation(params.kind)],
      classificationBadges: [],
      linkedIndicators: [],
      matchedFromKinds: [],
      attachmentId: params.attachmentId,
      analysisObjectId: params.analysisObjectId,
      attachmentDisplayName: params.name,
      resourceDisplayCategory:
        params.kind === 'file'
          ? 'attachment_file'
          : params.kind === 'file:content'
            ? 'derived_analysis_file'
            : undefined
    };
  }

  private pushIndicatorToGroupedResource(
    groupedResource: GroupedResource,
    indicator: NormalizedIndicator
  ) {
    const alreadyLinked = groupedResource.linkedIndicators.some((existing) => {
      return (
        String(existing.name || '').toLowerCase() === String(indicator.name || '').toLowerCase() &&
        String(existing.type || '').toLowerCase() === String(indicator.type || '').toLowerCase() &&
        this.cleanAnalysisObjectId(existing.objectId) === this.cleanAnalysisObjectId(indicator.objectId) &&
        String(existing.objectKind || '').toLowerCase() === String(indicator.objectKind || '').toLowerCase()
      );
    });

    if (!alreadyLinked) {
      groupedResource.linkedIndicators.push(indicator);
    }

    if (indicator.objectKind && !groupedResource.matchedFromKinds.includes(indicator.objectKind)) {
      groupedResource.matchedFromKinds.push(indicator.objectKind);
    }
  }

  private pushMipLabelToGroupedResource(groupedResource: GroupedResource, label: any) {
    const badgeLabel = String(label?.name || '-');

    if (
      !groupedResource.classificationBadges.some(
        (badge) => badge.rawKind === 'ms:mip' && badge.label === badgeLabel
      )
    ) {
      groupedResource.classificationBadges.push({
        label: badgeLabel,
        type: 'mip',
        rawKind: 'ms:mip'
      });
    }
  }

  
  private normalizeIndicators(item: any): NormalizedIndicator[] {
    const indicators = Array.isArray(item?.indicators) ? item.indicators : [];
    const normalized: NormalizedIndicator[] = [];

    for (const indicator of indicators) {
      const indicatorKind = String(indicator?.kind || '');
      const indicatorName = String(indicator?.name || '-');
      const matches = Array.isArray(indicator?.matches) ? indicator.matches : [];

      if (!matches.length) {
        normalized.push({
          id: String(indicator?.id || indicatorName),
          name: indicatorName,
          kind: indicatorKind,
          type: this.getIndicatorType(indicatorKind, '', indicatorName),
          matches: 0
        });
        continue;
      }

      for (const match of matches) {
        const snippets = Array.isArray(match?.snippets) ? match.snippets : [];
        const op = String(match?.op || '').toLowerCase();
        const objectId = String(match?.object?.id || '').trim();
        const objectName = String(match?.object?.name || '').trim();
        const objectKind = String(match?.object?.kind || '').trim();
        const snippetValue = String(
          match?.snippets?.[0]?.content?.data ||
          match?.result?.value ||
          ''
        ).trim();

        const statsCount = Number(match?.result?.stats?.count || 0);
        const snippetCount = snippets.length;
        const totalMatches = statsCount > 0 ? statsCount : snippetCount;

        normalized.push({
          id: String(
            indicator?.id ||
              `${indicatorName}-${op}-${objectId || objectName || 'resource'}`
          ),
          name: indicatorName,
          kind: indicatorKind,
          type: this.getIndicatorType(indicatorKind, op, indicatorName),
          matches: totalMatches,
          objectId: objectId || undefined,
          objectName: objectName || undefined,
          objectKind: objectKind || undefined,
          snippetValue: snippetValue || undefined
        });
      }
    }

    return normalized;
  }



  private uniqueIndicators(indicators: NormalizedIndicator[]) {
    const map = new Map<string, NormalizedIndicator>();

    for (const indicator of indicators || []) {
      const key = [
        String(indicator?.name || '').toLowerCase(),
        String(indicator?.type || '').toLowerCase(),
        this.cleanAnalysisObjectId(indicator?.objectId),
        String(indicator?.objectKind || '').toLowerCase()
      ].join('::');

      if (!map.has(key)) {
        map.set(key, indicator);
      }
    }

    return Array.from(map.values());
  }

  private getResourceDisplayName(resource: any) {
    return String(
      resource?._derivatives?.direction?.target?.name ||
      resource?._derivatives?.direction?.source?.name ||
      resource?.name ||
      '-'
    ).trim() || '-';
  }

  private groupResources(
    item: any,
    resources: any[],
    normalizedIndicators: NormalizedIndicator[]
  ) {
    const grouped = new Map<string, GroupedResource>();

    const realFileResources = (resources || []).filter((resource: any) => {
      return String(resource?.kind || '').toLowerCase() === 'file';
    });

    const realFilesById = new Map<string, GroupedResource>();
    const realFilesByName = new Map<string, GroupedResource>();

    // 1) cria grupo para todos os arquivos reais
    for (const resource of realFileResources) {
      const resourceId = String(resource?.id || '').trim();
      const resourceName = String(this.getResourceDisplayName(resource) || '').trim();

      if (!resourceId || !resourceName || this.isGenericResourceDisplayName(resourceName)) {
        continue;
      }

      const groupedResource = this.createGroupedResource({
        id: resourceId,
        name: resourceName,
        kind: 'file',
        attachmentId: resourceId
      });

      const labels = Array.isArray(resource?.classification?.labels)
        ? resource.classification.labels
        : [];

      for (const label of labels) {
        const labelKind = String(label?.kind || '').toLowerCase();
        if (labelKind === 'ms:mip') {
          this.pushMipLabelToGroupedResource(groupedResource, label);
        }
      }

      grouped.set(resourceId, groupedResource);
      realFilesById.set(resourceId.toLowerCase(), groupedResource);
      realFilesByName.set(resourceName.toLowerCase(), groupedResource);
    }

    // 2) vincula indicadores aos arquivos reais
    for (const indicator of normalizedIndicators) {
      const cleanObjectId = this.cleanAnalysisObjectId(indicator.objectId);
      const objectNameRaw = String(indicator.objectName || '').trim();
      const objectName = objectNameRaw.toLowerCase();
      const objectKind = String(indicator.objectKind || '').trim().toLowerCase();

      let matchedGroup: GroupedResource | null = null;

      // 2.1 match direto por id do resource
      if (cleanObjectId && realFilesById.has(cleanObjectId)) {
        matchedGroup = realFilesById.get(cleanObjectId)!;
      }

      // 2.2 match por part derivado (2:1:3 -> part-2)
      if (!matchedGroup && cleanObjectId) {
        const root = cleanObjectId.split(':')[0];
        const derivedPartId = root ? `part-${root}`.toLowerCase() : '';

        if (derivedPartId && realFilesById.has(derivedPartId)) {
          matchedGroup = realFilesById.get(derivedPartId)!;
        }
      }

      // 2.3 match por nome real do arquivo
      if (!matchedGroup && objectName && !this.isGenericResourceDisplayName(objectName)) {
        if (realFilesByName.has(objectName)) {
          matchedGroup = realFilesByName.get(objectName)!;
        }
      }

      if (matchedGroup) {
        this.pushIndicatorToGroupedResource(matchedGroup, indicator);
        continue;
      }

      // 2.4 assunto do email
      if (objectKind.includes('subject')) {
        const key = 'email-subject';

        if (!grouped.has(key)) {
          grouped.set(key, {
            id: key,
            name: 'Assunto do e-mail',
            displayName: 'Assunto do e-mail',
            kind: 'email:subject',
            locations: [this.formatResourceLocation('email:subject')],
            classificationBadges: [],
            linkedIndicators: [],
            matchedFromKinds: [],
            analysisObjectId: 'subject',
            resourceDisplayCategory: 'email_subject'
          });
        }

        this.pushIndicatorToGroupedResource(grouped.get(key)!, indicator);
        continue;
      }

      // 2.5 corpo do email
      if (objectKind.includes('body')) {
        const key = 'email-body';

        if (!grouped.has(key)) {
          grouped.set(key, {
            id: key,
            name: 'Corpo do e-mail',
            displayName: 'Corpo do e-mail',
            kind: 'email:body',
            locations: [this.formatResourceLocation('email:body')],
            classificationBadges: [],
            linkedIndicators: [],
            matchedFromKinds: [],
            analysisObjectId: 'body',
            resourceDisplayCategory: 'email_body'
          });
        }

        this.pushIndicatorToGroupedResource(grouped.get(key)!, indicator);
        continue;
      }

      // 2.6 metadata
      if (objectKind.includes('metadata')) {
        const key = 'email-metadata';

        if (!grouped.has(key)) {
          grouped.set(key, {
            id: key,
            name: 'Metadados do anexo',
            displayName: 'Metadados do anexo',
            kind: 'email:metadata',
            locations: [this.formatResourceLocation('email:metadata')],
            classificationBadges: [],
            linkedIndicators: [],
            matchedFromKinds: [],
            analysisObjectId: 'metadata',
            resourceDisplayCategory: 'attachment_metadata'
          });
        }

        this.pushIndicatorToGroupedResource(grouped.get(key)!, indicator);
      }

      // 2.7 arquivo analisado sem resource real correspondente
      if (
        objectKind.includes('file') &&
        objectName &&
        !this.isGenericResourceDisplayName(objectName)
      ) {
        const syntheticKey = `analysis-file:${objectName}`;

        if (!grouped.has(syntheticKey)) {
          const groupedResource = this.createGroupedResource({
            id: syntheticKey,
            name: objectNameRaw || indicator.objectName || objectName,
            kind: objectKind || 'file:content',
            analysisObjectId: cleanObjectId || objectNameRaw || objectName
          });

          groupedResource.resourceDisplayCategory = 'derived_analysis_file';
          groupedResource.attachmentDisplayName = objectNameRaw || indicator.objectName || objectName;
          groupedResource.displayName = objectNameRaw || indicator.objectName || objectName;

          grouped.set(syntheticKey, groupedResource);
        }

        this.pushIndicatorToGroupedResource(grouped.get(syntheticKey)!, indicator);
        continue;
      }
    }

    return Array.from(grouped.values()).map((entry) => ({
      ...entry,
      linkedIndicators: this.uniqueIndicators(entry.linkedIndicators),
      matchedFromKinds: Array.from(new Set(entry.matchedFromKinds)).sort((a, b) =>
        a.localeCompare(b)
      ),
      locations: Array.from(new Set(entry.locations)).sort((a, b) =>
        a.localeCompare(b)
      ),
      classificationBadges: entry.classificationBadges.filter(
        (badge, index, arr) =>
          arr.findIndex((x) => x.label === badge.label && x.rawKind === badge.rawKind) === index
      )
    }))
      .sort((a, b) => {
        const categoryOrder = [
          'attachment_file',
          'derived_analysis_file',
          'attachment_metadata',
          'email_subject',
          'email_body'
        ];

        const aIndex = categoryOrder.indexOf(String(a.resourceDisplayCategory || ''));
        const bIndex = categoryOrder.indexOf(String(b.resourceDisplayCategory || ''));

        const safeA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
        const safeB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;

        if (safeA !== safeB) {
          return safeA - safeB;
        }

        return String(a.displayName || a.name || '').localeCompare(
          String(b.displayName || b.name || '')
        );
      });
  }

  private buildFolderFilter(folders?: string[]) {
    const normalizedFolders = Array.isArray(folders)
      ? folders
          .map((folder) => String(folder || '').trim())
          .filter(Boolean)
      : [];

    if (!normalizedFolders.length) {
      return null;
    }

    return {
      $or: [
        {
          $stringIn: {
            'messages.location.name': normalizedFolders
          }
        }
      ]
    };
  }

  private buildBody(filter?: RangeFilter, folders?: string[]) {
    const rel = this.getRelativeMillis(filter);
    const folderFilter = this.buildFolderFilter(folders);

    const andFilters: any[] = [
      {
        $isNull: {
          'incident.id': false
        }
      },
      {
        $isNull: {
          'incident.remediations.status': true
        }
      },
      {
        $not: {
          $or: [
            {
              $stringIn: {
                'activity.categories': [
                  'it:internal:agent',
                  'it:internal:agent:start',
                  'it:internal:agent:stop',
                  'it:internal:agent:data-loss',
                  'it:internal:agent:tampering',
                  'it:internal:agent:functionality',
                  'it:internal:agent:informational',
                  'it:internal:agent:lifecycle',
                  'it:internal:agent:offline',
                  'it:internal:agent:metrics',
                  'it:internal:agent:error'
                ]
              }
            }
          ]
        }
      },
      {
        $not: {
          $or: [
            {
              $stringIn: {
                'activity.categories': ['pfpt:cloud:internal:event']
              }
            }
          ]
        }
      },
      {
        $not: {
          $or: [
            {
              $stringIn: {
                'audit.kind': ['it:auth-default:authorization:createAuthorizationSet:audit']
              }
            }
          ]
        }
      },
      {
        $not: {
          $or: [
            {
              $stringIn: {
                'event.kind': ['it:updater:internal:event']
              }
            }
          ]
        }
      },
      {
        $dtRelativeGE: {
          'event.observedAt': rel
        }
      },
      {
        $or: [
          {
            $stringIn: {
              'activity.categories': [
                'pfpt:incident:email:gateway:mta:message',
                'pfpt:incident:email:gateway:mta:message:outbound'
              ]
            }
          }
        ]
      }
    ];

    if (folderFilter) {
      andFilters.push(folderFilter);
    }

    return {
      sort: [
        {
          'event.observedAt': {
            order: 'desc',
            unmapped_type: 'boolean'
          }
        },
        {
          'event.id': {
            order: 'asc',
            unmapped_type: 'boolean'
          }
        }
      ],
      filters: {
        $and: andFilters
      }
    };
  }


  private normalizeItem(item: any) {
    const firstMessage = item?.messages?.[0] || {};
    const headersFrom = firstMessage?.headers?.parsed?.from || [];

    const senderEmail =
      firstMessage?.sender?.email ||
      headersFrom.find((x: any) => x?.email)?.email ||
      firstMessage?.sender?.id ||
      item?.user?.email ||
      item?.user?.id ||
      '-';

    const senderDisplayName =
      headersFrom.find((x: any) => x?.displayName)?.displayName ||
      firstMessage?.sender?.name ||
      senderEmail ||
      '-';

    const recipients = Array.isArray(firstMessage?.recipients)
      ? firstMessage.recipients
          .map((r: any) => r?.email || r?.id || r?.name)
          .filter(Boolean)
      : [];

    const reasons = Array.isArray(item?.incident?.reasons) ? item.incident.reasons : [];
    const normalizedDetectors = this.normalizeDetectors(item);
    const normalizedIndicators = this.normalizeIndicators(item);
    const groupedResources = this.groupResources(
      item,
      Array.isArray(item?.resources) ? item.resources : [],
      normalizedIndicators
    );

    const incidentReasons = reasons.map((reason: any) => {
      const indexes = Array.isArray(reason?.indicators) ? reason.indicators : [];

      return {
        id: String(reason?.id || reason?.name || 'reason'),
        name: String(reason?.name || '-'),
        alias: reason?.alias ? String(reason.alias) : undefined,
        severity: this.formatSeverity(reason?.severity || item?.incident?.severity),
        indicators: indexes
          .map((entry: any) => Number(entry?.index))
          .filter((idx: number) => Number.isInteger(idx) && idx >= 0 && idx < normalizedIndicators.length)
          .map((idx: number) => normalizedIndicators[idx])
      };
    });

    const attachments = Array.isArray(firstMessage?.attachments)
      ? firstMessage.attachments.map((att: any) => att?.name).filter(Boolean)
      : [];

    return {
      id: String(item?.id || ''),
      fqid: item?.fqid || null,
      observedAt: item?.event?.observedAt || null,
      sentAt: firstMessage?.sentAt || null,
      subject: firstMessage?.subject || '-',
      senderEmail,
      senderDisplayName,
      senderIsVap: Array.isArray(item?.user?.classification?.labels)
        ? item.user.classification.labels.some(
            (label: any) =>
              String(label?.value || '').toLowerCase() === 'pfpt:user:classification:vap'
          )
        : false,
      recipients,
      folder:
        item?.custom?.email?.data?.components?.messages?.folder ||
        firstMessage?.location?.name ||
        '-',
      incidentKind: this.formatIncidentKind(item?.incident?.kind),
      incidentStatus: this.formatIncidentStatus(item?.incident?.status),
      incidentSeverity: this.formatSeverity(item?.incident?.severity),
      incidentReasons,
      userEmail: item?.user?.email || item?.user?.id || '-',
      userName: item?.user?.displayName || item?.user?.name || '-',
      indicators: normalizedDetectors,
      resources: groupedResources,
      attachments,
      rawEvent: item
    };
  }

  public normalizeOneEmailEvent(item: any) {
    return this.normalizeItem(item);
  }
  
  

  async listEmailEvents(filter?: RangeFilter, folders?: string[]) {
    const token = await this.proofpointAuthService.getValidBearerToken();

    const url =
      `${this.baseUrl}/event-queries` +
      '?limit=1000&offset=0&entityTypes=event&sources=email:pps&includes=metrics&asyncKind=opensearch&trackTotalHits=true';

    const body = this.buildBody(filter, folders);

    this.logger.log(`REQUEST POST ${url}`);
    //this.logger.log(`REQUEST body ${JSON.stringify(body)}`); 
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${token}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify(body)
      
    });

    const raw = await response.text();
    
    // this.logger.log(`RESPONSE status ${response.status}`);
    this.logger.log(`RESPONSE body ${raw}`);

    let json: any = {};
    try {
      json = raw ? JSON.parse(raw) : {};
    } catch {
      json = {};
    }

    if (!response.ok) {
      throw new Error(`Erro ao consultar eventos de e-mail Proofpoint: ${response.status}`);
    }

    const data = Array.isArray(json?.data) ? json.data : [];

    return {
      total: json?._meta?.stats?.total ?? data.length,
      items: data
        .map((item: any, index: number) => {
          try {
            return this.normalizeItem(item);
          } catch (error: any) {
            console.error(
              '[proofpoint-email-events] ERRO ao normalizar item',
              JSON.stringify({
                index,
                eventId: item?.id || null,
                fqid: item?.fqid || null,
                subject: item?.messages?.[0]?.subject || null,
                sender:
                  item?.messages?.[0]?.sender?.email ||
                  item?.messages?.[0]?.sender?.id ||
                  item?.user?.email ||
                  item?.user?.id ||
                  null,
                indicatorKinds: Array.isArray(item?.indicators)
                  ? item.indicators.map((i: any) => i?.kind || null)
                  : [],
                indicatorNames: Array.isArray(item?.indicators)
                  ? item.indicators.map((i: any) => i?.name || null)
                  : [],
                resourceKinds: Array.isArray(item?.resources)
                  ? item.resources.map((r: any) => r?.kind || null)
                  : [],
                resourceNames: Array.isArray(item?.resources)
                  ? item.resources.map((r: any) => r?.name || null)
                  : [],
                error: error?.message || String(error)
              })
            );
            return null;
          }
        })
        .filter(Boolean)
    };
  }

  async approveByFqid(fqid: string, justification?: string) {
    const token = await this.proofpointAuthService.getValidBearerToken();

    const url =
      `${this.baseUrl}/events/${encodeURIComponent(fqid)}` +
      '/actions/remediation?workflowStatus=it-activity-event-workflow-status-aprovado---gestor';

    const body = {
      data: {
        remediation: {
          action: 'dlpadmin_release_noscan'
        },
        justification: justification || ''
      }
    };

    this.logger.log(`REQUEST PATCH ${url}`);
    this.logger.log(`REQUEST body ${JSON.stringify(body)}`);

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${token}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const raw = await response.text();
    this.logger.log(`RESPONSE status ${response.status}`);
    this.logger.log(`RESPONSE body ${raw}`);

    let json: any = {};
    try {
      json = raw ? JSON.parse(raw) : {};
    } catch {
      json = {};
    }

    if (!response.ok) {
      throw new Error(json?.message || `Erro ao aprovar FQID ${fqid}`);
    }

    return json;
  }
}
