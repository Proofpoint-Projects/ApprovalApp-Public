import { ApprovalAction, ApprovalItem, EndpointApprovalGrant } from './types';
import type { CSSProperties } from 'react';

 export type FlowIndicatorItem = {
    id?: string;
    name?: string;
    type?: string;
    kind?: string;
    matches?: number | null;
  };

  export type FlowIndicatorGroup = {
    type: string;
    label: string;
    items: FlowIndicatorItem[];
  };

  export type IndicatorContentObject = {
    id: string | null;
    name: string | null;
    kind: string | null;
  };

  export type IndicatorChip = {
    id: string;
    name: string;
    kind: string;
    matches: number | null;
    contentObjects: IndicatorContentObject[];
  };

  export type UnifiedUserInfo = {
    email?: string | null;
    username?: string | null;
    displayName?: string | null;
  };

  export type UnifiedApprovalResource = {
    id?: string;
    name?: string;
    kind?: string | null;
    extension?: string | null;
    size?: number | null;
    applicationName?: string | null;
    fileNames?: string[];
    actionType?: string;
    showFlow?: boolean;
    sourceLabel?: string;
    destinationLabel?: string;
    sourceValue?: string;
    destinationValue?: string;
    locations?: string[];
    matchedFromKinds?: string[];
    classificationBadges?: {
      label?: string;
      type?: string;
      rawKind?: string;
    }[];
    linkedIndicators?: ApprovalIndicator[];
  };

  export type UnifiedEmailInfo = {
    subject?: string | null;
    sender?: string | null;
    recipients?: string[];
    sentAt?: string | null;
  };

  export type UnifiedEndpointInfo = {
    hostname?: string | null;
    fqdn?: string | null;
    ip?: string | null;
  };

  export type UnifiedIncidentInfo = {
    policyName?: string | null;
    blockReason?: string | null;
    occurredAt?: string | null;
    severity?: string | null;
    status?: string | null;
    decisionComment?: string | null;
  };

  export type ResourceActionCard = {
    id: string;
    actionType: string;
    title: string;
    sourceLabel?: string;
    destinationLabel?: string;
    sourceValue?: string;
    destinationValue?: string;
    fileNames: string[];
    showFlow: boolean;
    showType: boolean;
    linkedIndicators?: ApprovalIndicator[];
    kind?: string | null;
    extension?: string | null;
    size?: number | null;
    applicationName?: string | null;
  };

  export type ApprovalPreview = {
    summary?: string | null;
    occurredAt?: string | null;
    mergeKey?: string | null;
    user?: {
      id?: string | null;
      email?: string | null;
      username?: string | null;
      displayName?: string | null;
    } | null;
    ruleDetails?: {
      id?: string | null;
      name?: string | null;
      description?: string | null;
    } | null;
    actionTypeLabels?: string[];
    incident?: {
      id?: string | null;
      kind?: string | null;
      name?: string | null;
      description?: string | null;
      status?: string | null;
      severity?: string | null;
    } | null;
    indicators?: Array<{
      id?: string | null;
      name?: string | null;
      kind?: string | null;
      matches?: number | null;
      contentObjects?: IndicatorContentObject[];
    }>;
    resources?: any[];
    endpoint?: {
      hostname?: string | null;
      fqdn?: string | null;
      ip?: string | null;
    } | null;
  };

  export type ScreenshotPreview = {
    id: string;
    fileName?: string | null;
    publicUrl?: string | null;
    localPath?: string | null;
    width?: number | null;
    height?: number | null;
    x?: number | null;
    y?: number | null;
    size?: number | null;
    windowTitle?: string | null;
    applicationName?: string | null;
    applicationDescription?: string | null;
    applicationVendor?: string | null;
    fqid?: string | null;
  };

  export type ApprovalIndicator = {
    id?: string;
    name?: string;
    kind?: string;
    type?: string;
    matches?: number;
    linkedIndicators?: ApprovalIndicator[];
    objectKind?: string;
    objectName?: string;
  };

  export type ApprovalResource = {
    id?: string | null;
    kind?: string | null;
    name?: string | null;
    path?: string | null;
    url?: string | null;
    host?: string | null;
    target?: boolean | null;
    extension?: string | null;
    size?: number | null;
    contentType?: string | null;
    linkedIndicators?: ApprovalIndicator[];
    tracking?: {
      sources?: Array<{
        genesis?: {
          kind?: string | null;
          resource?: {
            path?: string | null;
          } | null;
        } | null;
      }>;
    } | null;
    _derivatives?: {
      direction?: {
        source?: {
          name?: string | null;
          path?: string | null;
        } | null;
        target?: {
          name?: string | null;
          path?: string | null;
        } | null;
      } | null;
    } | null;
  };

  export function isEmailApproval(item?: ApprovalItem | null) {
    return String(item?.source || '').toUpperCase() === 'EMAIL_QUARANTINE';
  }

  export function shouldShowApprovalExpiration(item?: ApprovalItem | null) {
    return !isEmailApproval(item);
  }

  export function isEndpointApproval(item?: ApprovalItem | null) {
    const source = String(item?.source || '').toUpperCase();
    return source === 'ENDPOINT_ITM' || source === 'DLP';
  }

  export function formatResourceKindLabel(kind?: string) {
    const raw = String(kind || '').toLowerCase();

    if (!raw) return '-';
    if (raw === 'file') return 'Arquivo';
    if (raw === 'email:file') return 'Conteúdo do anexo';
    if (raw === 'email:body') return 'Corpo do e-mail';
    if (raw === 'email:subject') return 'Assunto do e-mail';
    if (raw === 'email:metadata') return 'Metadados do anexo';
    if (raw === 'message:file') return 'Conteúdo do anexo';
    if (raw === 'message:body') return 'Corpo do e-mail';
    if (raw === 'message:subject') return 'Assunto do e-mail';
    if (raw === 'message:metadata') return 'Metadados do anexo';
    if (raw === 'file:content') return 'Arquivo analisado';

    return String(kind);
  }

  export function formatIndicatorTypeLabel(type?: string | null) {
    const normalized = String(type || '').toLowerCase();

    if (normalized === 'smartid') return 'SmartID';
    if (normalized === 'classifier') return 'AI Classifier';
    if (normalized === 'dictionary') return 'Dictionary';
    if (normalized === 'dataset') return 'Dataset';
    if (normalized === 'fileset') return 'Fileset';
    if (normalized === 'idm') return 'IDM';
    if (normalized === 'edm') return 'EDM';
    if (normalized === 'classification') return 'Classification';
    if (normalized === 'detector') return 'Detector';
    if (normalized === 'mip') return 'MIP';

    if (!normalized) return 'Indicadores';

    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  export function getFlowDetectorsFromIndicators(indicators?: ApprovalIndicator[]) {
    const detectorItems = collapseIndicatorsForDisplay(
      (indicators || []).filter((indicator) => {
        const type = String(indicator?.type || getIndicatorType(indicator?.kind)).toLowerCase();
        return type === 'detector';
      })
    );

    if (!detectorItems.length) {
      return [];
    }

    return [
      {
        type: 'detector',
        label: 'Detectores',
        items: detectorItems.map((indicator) => ({
          id: indicator?.id,
          name: indicator?.name,
          type: indicator?.type,
          kind: indicator?.kind,
          matches: typeof indicator?.matches === 'number' ? indicator.matches : null
        }))
      }
    ];
  }

  export function getUnifiedResources(item: ApprovalItem | null): UnifiedApprovalResource[] {
    if (!item) return [];

    if (isEmailApproval(item)) {
      const data = getEmailApprovalData(item);
      return Array.isArray(data?.resources) ? data.resources : [];
    }

    return getResourceCards(item);
  }

  export function getUnifiedIndicators(item: ApprovalItem | null): ApprovalIndicator[] {
    if (!item) return [];

    if (isEmailApproval(item)) {
      const payload = getEmailPayload(item);
      return Array.isArray(payload?.indicators) ? payload.indicators : [];
    }

    return getIndicators(item);
  }

  export function getUnifiedScreenshots(item: ApprovalItem | null | undefined) {
    if (!item || isEmailApproval(item)) {
      return [];
    }

    return getScreenshots(item);
  }

  export function getMipBadges(resource?: UnifiedApprovalResource) {
    return (resource?.classificationBadges || []).filter(
      (badge) => String(badge?.rawKind || '').toLowerCase() === 'ms:mip'
    );
  }

  export function formatBytesForFlow(value?: number | null) {
    if (!value || value <= 0) return null;

    if (value >= 1024 * 1024 * 1024) {
      return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }

    if (value >= 1024 * 1024) {
      return `${(value / (1024 * 1024)).toFixed(2)} MB`;
    }

    if (value >= 1024) {
      return `${(value / 1024).toFixed(2)} KB`;
    }

    return `${value} B`;
  }

  export function getResourceExtensionLabel(resource?: ApprovalResource | ResourceActionCard | any) {
    const rawExtension = String(resource?.extension || '').trim().replace(/^\./, '');
    if (rawExtension) return rawExtension.toLowerCase();

    const fileName =
      Array.isArray(resource?.fileNames) && resource.fileNames.length
        ? String(resource.fileNames[0] || '')
        : String(resource?.name || resource?.sourceValue || '');

    const match = fileName.match(/\.([a-zA-Z0-9]+)$/);
    return match?.[1]?.toLowerCase() || null;
  }

  export function getScreenshotApplicationNameForResource(
    resource: any,
    screenshots?: ScreenshotPreview[]
  ) {
    const shots = Array.isArray(screenshots) ? screenshots : [];
    const firstValid = shots.find((shot) => String(shot?.applicationName || '').trim());
    return firstValid?.applicationName || null;
  }

export function getNonMipIndicators(resource?: UnifiedApprovalResource) {
  return dedupeIndicators(
    (resource?.linkedIndicators || []).filter((indicator) => {
      const type = String(indicator?.type || '').toLowerCase();
      return type !== 'mip';
    })
  );
}

export function getIndicatorType(kind?: string | null) {
  const normalized = String(kind || '').toLowerCase();

  if (normalized === 'smartid') return 'smartid';
  if (normalized === 'detector' || normalized.includes('detector')) return 'detector';
  if (normalized === 'dataset') return 'dataset';
  if (normalized === 'fileset') return 'fileset';
  if (normalized === 'classification') return 'classification';
  if (normalized === 'classifier' || normalized.includes('ai:classifier') || normalized.includes('classifier')) return 'classifier';
  if (normalized.includes('dictionary')) return 'dictionary';
  if (normalized.includes('idm')) return 'idm';
  if (normalized.includes('edm')) return 'edm';
  if (normalized.includes('mip')) return 'mip';
  
  return normalized || 'indicator';
}

  function humanizeMatchedKind(kind?: string) {
    const raw = String(kind || '').toLowerCase();

    if (!raw) return '-';
    if (raw === 'message:file' || raw === 'email:file' || raw === 'file:content') {
      return 'conteúdo do anexo';
    }
    if (raw === 'message:subject' || raw === 'email:subject') {
      return 'assunto do e-mail';
    }
    if (raw === 'message:body' || raw === 'email:body') {
      return 'corpo do e-mail';
    }
    if (raw === 'message:metadata' || raw === 'email:metadata') {
      return 'metadados do anexo';
    }

    return raw;
  }

  export function formatMatchedFromKindsLabel(
    matchedFromKinds?: string[],
    fallbackLocations?: string[]
  ) {
    const normalized = Array.isArray(matchedFromKinds)
      ? matchedFromKinds.map(humanizeMatchedKind).filter(Boolean)
      : [];

    if (normalized.length) {
      return Array.from(new Set(normalized)).join(', ');
    }

    const fallback = Array.isArray(fallbackLocations)
      ? fallbackLocations.filter(Boolean)
      : [];

    return fallback.length ? Array.from(new Set(fallback)).join(', ') : '-';
  }

function getResolvedEmailResourceFileName(resource: any) {
  const explicitName = String(resource?.displayName || resource?.attachmentDisplayName || '').trim();
  if (explicitName && !isGenericEmailResourceName(explicitName)) {
    return explicitName;
  }

  const directName = String(resource?.name || '').trim();
  if (directName && !isGenericEmailResourceName(directName)) {
    return directName;
  }

  const fileNames = Array.isArray(resource?.fileNames)
    ? resource.fileNames.map((value: any) => String(value || '').trim()).filter(Boolean)
    : [];

  const firstRealFileName = fileNames.find((value: string) => !isGenericEmailResourceName(value));
  return firstRealFileName || '';
}

  function getEmailResourceGroupKey(resource: any) {
  const category = String(resource?.resourceDisplayCategory || '');
  const kind = String(resource?.kind || '').toLowerCase();
  const resolvedName = getResolvedEmailResourceFileName(resource);

  if (
    resolvedName &&
    (category === 'attachment_content' ||
      category === 'attachment_metadata' ||
      kind === 'email:file' ||
      kind === 'email:metadata' ||
      kind === 'file')
  ) {
    return resolvedName;
  }

  return '';
}

  export function groupEmailResourcesForDisplay(resources: any[]) {
    const attachmentGroups = new Map<string, any[]>();
    const standalone: any[] = [];

    for (const resource of resources || []) {
      const kind = String(resource?.kind || '').toLowerCase();
      const category = String(resource?.resourceDisplayCategory || '');
      const groupKey = getEmailResourceGroupKey(resource).trim();

      if (category === 'derived_analysis_file' || kind === 'file:content') {
        standalone.push(resource);
        continue;
      }

      if (groupKey && !isGenericEmailResourceName(groupKey)) {
        if (!attachmentGroups.has(groupKey)) {
          attachmentGroups.set(groupKey, []);
        }
        attachmentGroups.get(groupKey)!.push(resource);
        continue;
      }

      if (
        kind === 'email:subject' ||
        kind === 'email:body' ||
        kind === 'message:subject' ||
        kind === 'message:body'
      ) {
        standalone.push(resource);
        continue;
      }

      standalone.push(resource);
    }

    return {
      attachmentGroups: Array.from(attachmentGroups.entries()).map(([attachmentName, items]) => ({
        attachmentName,
        items
      })),
      standalone
    };
  }


  export function getEmailResourceSectionTitle(resource: any) {
    const category = String(resource?.resourceDisplayCategory || '');
    const kind = String(resource?.kind || '').toLowerCase();

    if (category === 'attachment_content') return 'Conteúdo do anexo';
    if (category === 'attachment_metadata') return 'Metadados do anexo';
    if (category === 'derived_analysis_file' || kind === 'file:content') return 'Arquivo analisado';
    if (category === 'email_subject' || kind === 'email:subject') return 'Assunto do e-mail';
    if (category === 'email_body' || kind === 'email:body') return 'Corpo do e-mail';

    return formatResourceKindLabel(kind);
  }

export function getEmailResourceTitle(resource: any) {
  const kind = String(resource?.kind || '').toLowerCase();
  const category = String(resource?.resourceDisplayCategory || '');
  const resolvedName = getResolvedEmailResourceFileName(resource);

  if (kind === 'email:file') {
    return resolvedName || 'Conteúdo do anexo';
  }

  if (kind === 'email:metadata') {
    return resolvedName ? `Metadados de ${resolvedName}` : 'Metadados do anexo';
  }

  if (category === 'derived_analysis_file' || kind === 'file:content') {
    return resolvedName || 'Arquivo analisado';
  }

  if (kind === 'email:subject') {
    return 'Assunto do e-mail';
  }

  if (kind === 'email:body') {
    return 'Corpo do e-mail';
  }

  if (kind === 'file') {
    return resolvedName || 'Arquivo';
  }

  return formatResourceKindLabel(kind);
}

  export function isGenericEmailResourceName(value?: string | null) {
    const raw = String(value || '').trim().toLowerCase();
    return ['file', 'subject', 'metadata', 'body'].includes(raw);
  }

export function shouldShowTechnicalResourceName(resource: any) {
  return Boolean(getResolvedEmailResourceFileName(resource));
}

export function hasSensitiveContentIndicators(resource: any) {
  const indicators = Array.isArray(resource?.linkedIndicators) ? resource.linkedIndicators : [];
  const nonMipIndicators = indicators.filter((indicator: any) => {
    const type = String(indicator?.type || '').toLowerCase();
    return type !== 'mip';
  });

  return nonMipIndicators.length > 0;
}

function collapseIndicatorsForDisplay(indicators?: ApprovalIndicator[]) {
  const map = new Map<string, ApprovalIndicator>();

  for (const indicator of dedupeIndicators(indicators || [])) {
    const type = String(indicator?.type || getIndicatorType(indicator?.kind) || 'indicator').toLowerCase();
    const name = String(indicator?.name || '').trim();
    const key = [type, name].join('::');
    const currentMatches = typeof indicator?.matches === 'number' ? indicator.matches : 0;

    if (!map.has(key)) {
      map.set(key, {
        ...indicator,
        type,
        matches: currentMatches || undefined
      });
      continue;
    }

    const existing = map.get(key)!;
    const existingMatches = typeof existing?.matches === 'number' ? existing.matches : 0;

    if (currentMatches > existingMatches) {
      map.set(key, {
        ...existing,
        ...indicator,
        type,
        matches: currentMatches || undefined
      });
    }
  }

  return Array.from(map.values());
}

export function renderGroupedIndicatorChips(
    indicators: ApprovalIndicator[] | undefined,
    styles: Record<string, CSSProperties>,
    resourceId: string
  ) {
      const groups = groupIndicatorsByType(dedupeIndicators(indicators || []));

      return groups.map((group, groupIdx) => (
        <div
          key={`${resourceId}-${group.type}-${groupIdx}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 8
          }}
        >
           <span
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: '#93c5fd',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              lineHeight: 1,
              display: 'inline-flex',
              alignItems: 'center'
            }}
          >
            {group.label}
          </span>

          <span
            style={{
              fontSize: 13,
              color: '#93c5fd',
              lineHeight: 1,
              display: 'inline-flex',
              alignItems: 'center'
            }}
          >
            •
          </span>

        <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                alignItems: 'center'
              }}
            >
            {group.items.map((indicator, i) => {
              const visual = getIndicatorVisual(indicator.type, indicator.kind);

              return (
                <span
                  key={`${resourceId}-${group.type}-${indicator.id || i}`}
                  style={{
                    ...styles.proofpointChipLarge,
                    backgroundColor: visual.backgroundColor,
                    border: visual.border,
                    color: visual.color
                  }}
                >
                  {indicator.name || '-'}
                  {indicator.matches ? ` (${indicator.matches})` : ''}
                </span>
              );
            })}
          </div>
        </div>
      ));
  }

export function groupIndicatorsByType(indicators?: ApprovalIndicator[]) {
  const grouped = new Map<string, ApprovalIndicator[]>();

  for (const indicator of collapseIndicatorsForDisplay(indicators || [])) {
    const key = String(indicator?.type || getIndicatorType(indicator?.kind) || 'indicator').toLowerCase();

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }

    grouped.get(key)!.push(indicator);
  }

  return Array.from(grouped.entries()).map(([type, items]) => ({
    type,
    label: formatIndicatorTypeLabel(type),
    items
  }));
}

  export function getFlowIndicatorsFromResource(
    resource?: UnifiedApprovalResource | ApprovalResource | null
  ): FlowIndicatorGroup[] {
    const grouped = groupResourceIndicatorsForInlineDisplay(
      (resource?.linkedIndicators || []).filter((indicator) => {
        const type = String(indicator?.type || getIndicatorType(indicator?.kind)).toLowerCase();
        return type !== 'detector';
      })
    );

    return grouped.map((group) => ({
      type: group.type,
      label: group.label,
      items: (group.items || []).map((indicator) => ({
        id: indicator?.id,
        name: indicator?.name,
        type: indicator?.type,
        kind: indicator?.kind,
        matches: typeof indicator?.matches === 'number' ? indicator.matches : null
      }))
    }));
  }

export function groupResourceIndicatorsForInlineDisplay(indicators?: ApprovalIndicator[]) {
  const grouped = groupIndicatorsByType(collapseIndicatorsForDisplay(indicators || []));

  return grouped.map((group) => ({
    type: group.type,
    label: group.label,
    items: group.items
  }));
}

export function getIndicatorVisual(type?: string | null,kind?: string | null) {
  const normalized = String(type || '').toLowerCase();
  const rawKind = String(kind || '').toLowerCase();
  const isProofpoint = rawKind.startsWith('pfpt:') || rawKind.startsWith('it:');

  if (normalized === 'smartid') {
    return {
      backgroundColor: '#2563eb',
      border: '1px solid #60a5fa',
      color: '#eff6ff'
    };
  }

  if (normalized === 'classifier') {
    return {
      backgroundColor: '#7c3aed',
      border: '1px solid #a78bfa',
      color: '#f5f3ff'
    };
  }

  if (normalized === 'dictionary') {
    return {
      backgroundColor: '#059669',
      border: '1px solid #34d399',
      color: '#ecfdf5'
    };
  }

  if (normalized === 'dataset') {
    return {
      backgroundColor: '#ea580c',
      border: '1px solid #fb923c',
      color: '#fff7ed'
    };
  }

  if (normalized === 'fileset') {
    return {
      backgroundColor: '#d946ef',
      border: '1px solid #f5d0fe',
      color: '#fdf4ff'
    };
  }

  if (normalized === 'idm') {
    return {
      backgroundColor: '#0ea5e9',
      border: '1px solid #7dd3fc',
      color: '#f0f9ff'
    };
  }

  if (normalized === 'edm') {
    return {
      backgroundColor: '#06b6d4',
      border: '1px solid #a5f3fc',
      color: '#ecfeff'
    };
  }

  if (normalized === 'classification') {
    return {
      backgroundColor: '#a855f7',
      border: '1px solid #ddd6fe',
      color: '#faf5ff'
    };
  }

  if (normalized === 'mip') {
    return {
      backgroundColor: '#3b82f6',
      border: '1px solid #93c5fd',
      color: '#eff6ff'
    };
  }

  if (normalized === 'detector') {
    return {
      backgroundColor: '#e11d48',
      border: '1px solid #fda4af',
      color: '#fff1f2'
    };
  }

  return isProofpoint
    ? {
        backgroundColor: '#2563eb',
        border: '1px solid #60a5fa',
        color: '#eff6ff'
      }
    : {
        backgroundColor: '#475569',
        border: '1px solid #94a3b8',
        color: '#f8fafc'
      };
}

export function dedupeIndicators<T extends {
    id?: string | null;
    name?: string | null;
    kind?: string | null;
    type?: string | null;
    objectKind?: string | null;
    objectName?: string | null;
  }>(indicators?: T[]) {
    const map = new Map<string, T>();

    for (const indicator of indicators || []) {
      const key = [
        String(indicator?.id || ''),
        String(indicator?.name || ''),
        String(indicator?.kind || ''),
        String(indicator?.type || ''),
        String(indicator?.objectKind || ''),
        String(indicator?.objectName || '')
      ].join('::');

      if (!map.has(key)) {
        map.set(key, indicator);
      }
    }

    return Array.from(map.values());
  }

export function getScreenshots(item: ApprovalItem | null): ScreenshotPreview[] {
  const preview = getPreview(item);
  const screenshots = Array.isArray((preview as any)?.screenshots)
    ? (preview as any).screenshots
    : [];

  return screenshots
    .filter((shot: any) => {
      const id = String(shot?.id || '').trim();
      const publicUrl = String(shot?.publicUrl || '').trim();
      return Boolean(id && publicUrl);
    })
    .map((shot: any) => ({
      id: String(shot.id),
      fileName: shot.fileName || null,
      publicUrl: shot.publicUrl || null,
      localPath: shot.localPath || null,
      width: typeof shot.width === 'number' ? shot.width : null,
      height: typeof shot.height === 'number' ? shot.height : null,
      x: typeof shot.x === 'number' ? shot.x : null,
      y: typeof shot.y === 'number' ? shot.y : null,
      size: typeof shot.size === 'number' ? shot.size : null,
      windowTitle: shot.windowTitle || null,
      applicationName: shot.applicationName || null,
      applicationDescription: shot.applicationDescription || null,
      applicationVendor: shot.applicationVendor || null,
      fqid: shot.fqid || null
    }));
}

export function getPreview(item: ApprovalItem | null): ApprovalPreview {
  return ((item?.previewJson as ApprovalPreview) || {}) as ApprovalPreview;
}

export function formatSourceLabel(source?: string | null) {
  const value = String(source || '').toUpperCase();
  if (value === 'ENDPOINT_ITM') return 'Endpoint';
  if (value === 'DLP') return 'DLP';
  if (value === 'EMAIL_QUARANTINE') return 'E-mail';
  return source || '-';
}

export function formatStatusLabel(status?: string | null) {
  const value = String(status || '').toUpperCase();
  if (value === 'PENDING') return 'Pendente';
  if (value === 'APPROVED') return 'Aprovado';
  if (value === 'DENIED') return 'Não aprovado';
  if (value === 'PROCESSING') return 'Processando'; 
  if (value === 'ERROR') return 'Erro';
  if (value === 'EXPIRED') return 'Expirado';
  return status || '-';
}

export function formatIncidentSeverity(severity?: string | null) {
  const raw = String(severity || '').toLowerCase();
  if (raw.includes('high')) return 'High';
  if (raw.includes('medium')) return 'Medium';
  if (raw.includes('low')) return 'Low';
  return '-';
}

export function formatIncidentStatus(status?: string | null) {
  const raw = String(status || '').trim();
  if (!raw) return '-';
  const last = raw.split(':').pop() || raw;
  return last.charAt(0).toUpperCase() + last.slice(1).toLowerCase();
}

export function formatIndicatorKind(kind?: string | null) {
  const value = String(kind || '').toLowerCase();

  if (value === 'smartid') return 'Smart ID';
  if (value === 'detector') return 'Detector';
  if (value.includes('mip')) return 'MIP';

  return kind || '-';
}

export function getPolicyTitle(item: ApprovalItem | null) {
  const preview = getPreview(item);

  return (
    preview?.ruleDetails?.name ||
    item?.policyName ||
    preview?.incident?.name ||
    '-'
  );
}

export function getBlockReason(item: ApprovalItem | null) {
  const preview = getPreview(item);

  return (
    preview?.incident?.description ||
    preview?.summary ||
    item?.policyReason ||
    '-'
  );
}

export function getDecisionComment(item: ApprovalItem | null) {
  const actions = Array.isArray(item?.actions) ? item.actions : [];
  const latest = [...actions].reverse().find(
    (action: ApprovalAction) => action?.action === 'APPROVE' || action?.action === 'DENY'
  );

  return latest?.comment || '-';
}

export function getApprovalInfo(item: ApprovalItem | null) {
  const endpointGrant = (item?.endpointGrant || null) as EndpointApprovalGrant | null;

  return {
    approvedAt: item?.decidedAt || null,
    expiresAt: endpointGrant?.expiresAt || null,
    removeAfterAt: endpointGrant?.removeAfterAt || null,
    grantStatus: endpointGrant?.status || null
  };
}

export function getIndicators(item: ApprovalItem | null): ApprovalIndicator[] {
  const preview = getPreview(item);
  const indicators = Array.isArray((preview as any)?.indicators) ? (preview as any).indicators : [];

  return indicators
    .filter((indicator: any) => {
      const kind = String(indicator?.kind || '').trim().toLowerCase();
      const name = String(indicator?.name || '').trim();

      if (!kind) return false;
      if (!name) return false;
      if (kind.startsWith('it:')) return false;

      return true;
    })
    .map((indicator: any) => ({
      id: indicator?.id || undefined,
      name: indicator?.name || undefined,
      kind: indicator?.kind || undefined,
      type: indicator?.type || getIndicatorType(indicator?.kind),
      matches: typeof indicator?.matches === 'number' ? indicator.matches : null,
      linkedIndicators: Array.isArray(indicator?.linkedIndicators)
        ? indicator.linkedIndicators.map((linked: any) => ({
            id: linked?.id || undefined,
            name: linked?.name || undefined,
            kind: linked?.kind || undefined,
            type: linked?.type || getIndicatorType(linked?.kind),
            matches: typeof linked?.matches === 'number' ? linked.matches : null
          }))
        : []
    }));
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function dedupeById<T extends { id: string }>(items: T[]) {
  const map = new Map<string, T>();

  for (const item of items) {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  }

  return Array.from(map.values());
}

  function getEmailApprovalData(item?: ApprovalItem | null): any {
    if (!item || !isEmailApproval(item)) return null;

    const preview = item?.previewJson || {};
    const payload = item?.payloadJson || {};

    // prioriza o preview normalizado salvo na aprovação
    if (preview && (preview as any).subject) {
      return preview;
    }

    return payload;
  }

  function getEmailPayload(item?: ApprovalItem | null): any {
    if (!item || !isEmailApproval(item)) return null;
    return item.payloadJson || null;
  }

  function buildUploadCard(
    endpointHostname: string,
    webResource: any,
    fileResources: any[]
  ): ResourceActionCard | null {
    const validFiles = (fileResources || []).filter((resource: any) =>
      String(resource?.name || '').trim()
    );

    const primaryFile = validFiles[0] || null;

    const fileNames = uniqueStrings(
      validFiles
        .map((resource: any) => String(resource?.name || '').trim())
        .filter(Boolean)
    );

    const linkedIndicators = dedupeIndicators(
      validFiles.flatMap((resource: any) =>
        Array.isArray(resource?.linkedIndicators) ? resource.linkedIndicators : []
      )
    );

    if (!webResource && !fileNames.length) {
      return null;
    }

    return {
      id: `upload-${String(webResource?.id || webResource?.url || 'web')}`,
      actionType: 'Web File Upload',
      title: 'Ação detectada',
      sourceLabel: 'Origem',
      destinationLabel: 'Destino',
      sourceValue: String(primaryFile?.path || primaryFile?.name || '-'),
      destinationValue: String(webResource?.url || webResource?.host || '-'),
      fileNames,
      linkedIndicators,
      showFlow: true,
      showType: false,
      kind: primaryFile?.kind || 'file',
      extension: primaryFile?.extension || null,
      size: typeof primaryFile?.size === 'number' ? primaryFile.size : null
    };
  }

export function getUnifiedEmailInfo(item?: ApprovalItem | null): UnifiedEmailInfo {
  if (!item) return {};

  if (isEmailApproval(item)) {
    const data = getEmailApprovalData(item);

    return {
      subject: data?.subject || item.messageSubject || null,
      sender: data?.senderEmail || item.messageSender || null,
      recipients: Array.isArray(data?.recipients) ? data.recipients : [],
      sentAt: data?.sentAt || null
    };
  }

  return {
    subject: item.messageSubject || null,
    sender: item.messageSender || null,
    recipients: [],
    sentAt: null
  };
}

export function getUnifiedUserInfo(item?: ApprovalItem | null): UnifiedUserInfo {
  if (!item) return {};

  if (isEmailApproval(item)) {
    const data = getEmailApprovalData(item);

    return {
      email: data?.userEmail || item.requesterEmail || null,
      username: null,
      displayName: data?.userName || item.requesterName || null
    };
  }

  const preview = getPreview(item);
  const user = preview?.user || {};

  return {
    email: item.requesterEmail || null,
    username: user?.username || null,
    displayName: user?.displayName || item.requesterName || null
  };
}

export function getUnifiedEndpointInfo(item?: ApprovalItem | null): UnifiedEndpointInfo {
  if (!item || isEmailApproval(item)) {
    return {};
  }

  const preview = getPreview(item);
  const endpoint = preview?.endpoint || {};

  return {
    hostname: endpoint?.hostname || item.deviceHostname || null,
    fqdn: endpoint?.fqdn || null,
    ip: endpoint?.ip || null
  };
}

export function getUnifiedIncidentInfo(item?: ApprovalItem | null): UnifiedIncidentInfo {
  if (!item) return {};

  if (isEmailApproval(item)) {
    const data = getEmailApprovalData(item);

    return {
      policyName: getPolicyTitle(item),
      blockReason: getBlockReason(item),
      occurredAt: data?.sentAt || null,
      severity: data?.incidentSeverity || null,
      status: data?.incidentStatus || null,
      decisionComment: getDecisionComment(item)
    };
  }

  const preview = getPreview(item);
  const incident = preview?.incident || {};

  return {
    policyName: getPolicyTitle(item),
    blockReason: getBlockReason(item),
    occurredAt: preview?.occurredAt || null,
    severity: incident?.severity || null,
    status: incident?.status || null,
    decisionComment: getDecisionComment(item)
  };
}

export function getResourceCards(item: ApprovalItem | null): ResourceActionCard[] {
  const preview = getPreview(item);
  const endpointHostname = String(preview?.endpoint?.hostname || item?.deviceHostname || '-');
  const resources = Array.isArray(preview?.resources) ? preview.resources : [];

  const webResources = resources.filter(
    (resource: any) => String(resource?.kind || '').toLowerCase() === 'web'
  );

  const fileResources = resources.filter(
    (resource: any) => String(resource?.kind || '').toLowerCase() === 'file'
  );

  const cards: ResourceActionCard[] = [];

  const uploadFiles = fileResources.filter((resource: any) => {
    const hasName = String(resource?.name || '').trim().length > 0;
    const hasTracking = Boolean(resource?.tracking);
    return hasName && !hasTracking;
  });

  if (webResources.length) {
    const uploadCard = buildUploadCard(endpointHostname, webResources[0], uploadFiles);
    if (uploadCard) {
      cards.push(uploadCard);
    }
  }

  const trackedFiles = fileResources.filter((resource: any) => {
    const hasName = String(resource?.name || '').trim().length > 0;
    return hasName && Boolean(resource?.tracking);
  });

  const copyGroups = new Map<string, ResourceActionCard>();

  for (const resource of trackedFiles) {
    const trackingSource = Array.isArray(resource?.tracking?.sources)
      ? resource.tracking.sources[0]
      : null;

    const trackingKind = String(trackingSource?.genesis?.kind || '').toLowerCase();

    const actionType = trackingKind.includes('network:file:copy')
      ? 'Copy to Network Drive'
      : 'Arquivo';

    const sourceValue = String(
      resource?._derivatives?.direction?.source?.path ||
        resource?.path ||
        '-'
    );

    const destinationValue = String(
      trackingSource?.genesis?.resource?.path ||
        resource?.url ||
        resource?.host ||
        '-'
    );

    const key = [actionType, sourceValue, destinationValue].join('|');

    if (!copyGroups.has(key)) {
      copyGroups.set(key, {
        id: key,
        actionType,
        title: 'Ação detectada',
        sourceLabel: 'Origem do arquivo',
        destinationLabel: 'Destino',
        sourceValue,
        destinationValue,
        fileNames: [],
        linkedIndicators: [],
        showFlow: true,
        showType: false,
        kind: resource?.kind || 'file',
        extension: resource?.extension || null,
        size: typeof resource?.size === 'number' ? resource.size : null
      });
    }

    const group = copyGroups.get(key)!;
    const fileName = String(resource?.name || '').trim();

    if (fileName) {
      group.fileNames.push(fileName);
    }

    const resourceIndicators = Array.isArray(resource?.linkedIndicators)
      ? resource.linkedIndicators
      : [];

    group.linkedIndicators = dedupeIndicators([
      ...(group.linkedIndicators || []),
      ...resourceIndicators
    ]);
  }

  cards.push(
    ...Array.from(copyGroups.values()).map((card) => ({
      ...card,
      fileNames: uniqueStrings(card.fileNames),
      linkedIndicators: dedupeIndicators(card.linkedIndicators || [])
    }))
  );

  return dedupeById(cards);
}