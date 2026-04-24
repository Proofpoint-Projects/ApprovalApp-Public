'use client';

import { sharedStyles, mergeStyles, stylesForRow } from '../../../lib/ui-styles';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { apiFetch } from '../../../lib/api';
import { ApprovalItem } from '../../../lib/types';
import {
  getApprovalInfo,
  getBlockReason,
  getDecisionComment,
  getPolicyTitle,
  formatIncidentSeverity,
  formatIncidentStatus,
  formatIndicatorKind,
  formatSourceLabel,
  formatStatusLabel,
  getIndicatorVisual,
  getUnifiedUserInfo,
  getUnifiedEmailInfo,
  getUnifiedEndpointInfo,
  getUnifiedIncidentInfo,
  getUnifiedResources,
  getUnifiedIndicators,
  getUnifiedScreenshots,
  isEmailApproval,
  getPreview,
  getMipBadges,
  getNonMipIndicators,
  formatResourceKindLabel,
  formatMatchedFromKindsLabel,
  groupEmailResourcesForDisplay,
  getEmailResourceSectionTitle
} from '../../../lib/helpers-preview';

import type { ApprovalIndicator } from '../../../lib/helpers-preview';

function isResourceHighlighted(resource: any) {
  return getMipBadges(resource).length > 0 || getNonMipIndicators(resource).length > 0;
}

function isGenericEmailLabel(value?: string) {
  const normalized = String(value || '').trim().toLowerCase();
  return (
    !normalized ||
    normalized === 'arquivo' ||
    normalized === 'file' ||
    normalized === 'subject' ||
    normalized === 'metadata' ||
    normalized === 'body'
  );
}

function getSafeAttachmentLabel(group: any) {
  const directLabel = String(group?.attachmentName || '').trim();
  if (directLabel && !isGenericEmailLabel(directLabel)) {
    return directLabel;
  }

  const itemNames = Array.isArray(group?.items)
    ? group.items
        .map((item: any) => String(item?.attachmentDisplayName || item?.name || '').trim())
        .filter((value: string) => value && !isGenericEmailLabel(value))
    : [];

  return itemNames[0] || directLabel || 'Arquivo';
}

function getVisibleResourceItems(items: any[]) {
  return (Array.isArray(items) ? items : []).filter((resource: any) => {
    const hasIndicators =
      getNonMipIndicators(resource).length > 0 ||
      getMipBadges(resource).length > 0;

    return hasIndicators;
  });
}

function getCleanAttachmentHintStyle(): CSSProperties {
  return {
    marginTop: 10,
    color: '#94a3b8',
    fontStyle: 'italic'
  };
}

function getIndicatorGroupLabel(indicator: any) {
  const rawType = String(indicator?.type || '').toLowerCase();
  const rawKind = String(
    indicator?.rawKind || indicator?.kind || indicator?.type || ''
  ).toLowerCase();

  if (rawType === 'mip' || rawKind.includes('mip')) return 'MIP';
  if (rawType === 'smartid' || rawKind.includes('smartid')) return 'SMARTID';
  if (rawType === 'dataset' || rawKind.includes('dataset')) return 'DATASET';
  if (rawType === 'dictionary' || rawKind.includes('dictionary')) return 'DICTIONARY';
  if (rawType === 'classifier' || rawKind.includes('classifier')) return 'AI CLASSIFIER';
  if (rawType === 'fileset' || rawKind.includes('fileset')) return 'FILESET';
  if (rawType === 'idm' || rawKind.includes('idm')) return 'IDM';
  if (rawType === 'edm' || rawKind.includes('edm')) return 'EDM';
  if (rawType === 'classification' || rawKind === 'classification') return 'CLASSIFICATION';
  if (rawType === 'detector' || rawKind === 'detector' || rawKind.includes('detector')) return 'DETECTOR';

  return String(indicator?.type || indicator?.kind || 'OUTROS')
    .replace(/^pfpt:/i, '')
    .replace(/^it:/i, '')
    .toUpperCase();
}

function getIndicatorChipLabel(indicator: any) {
  const name = String(indicator?.name || indicator?.label || '-').trim() || '-';
  const matches = typeof indicator?.matches === 'number' ? indicator.matches : null;
  return matches && matches > 0 ? `${name} (${matches})` : name;
}

function getIndicatorChipStyle(indicator: any): CSSProperties {
  const rawType = String(indicator?.type || '').toLowerCase();
  const rawKind = String(
    indicator?.rawKind || indicator?.kind || indicator?.type || ''
  ).toLowerCase();

  if (rawType === 'dataset' || rawKind.includes('dataset')) {
    return {
      ...styles.proofpointChipLarge,
      background: 'rgba(234, 88, 12, 0.88)',
      border: '1px solid rgba(251, 146, 60, 0.95)',
      color: '#fff7ed'
    };
  }

  if (rawType === 'dictionary' || rawKind.includes('dictionary')) {
    return {
      ...styles.proofpointChipLarge,
      background: 'rgba(22, 163, 74, 0.72)',
      border: '1px solid rgba(110, 231, 183, 0.65)',
      color: '#ecfdf5'
    };
  }

  if (rawType === 'classifier' || rawKind.includes('classifier')) {
    return {
      ...styles.proofpointChipLarge,
      background: 'rgba(124, 58, 237, 0.88)',
      border: '1px solid rgba(196, 181, 253, 0.75)',
      color: '#f5f3ff'
    };
  }

  if (rawType === 'fileset' || rawKind.includes('fileset')) {
    return {
      ...styles.proofpointChipLarge,
      background: 'rgba(217, 70, 239, 0.86)',
      border: '1px solid rgba(245, 208, 254, 0.75)',
      color: '#fdf4ff'
    };
  }

  if (rawType === 'idm' || rawKind.includes('idm')) {
    return {
      ...styles.proofpointChipLarge,
      background: 'rgba(14, 165, 233, 0.82)',
      border: '1px solid rgba(125, 211, 252, 0.72)',
      color: '#f0f9ff'
    };
  }

  if (rawType === 'edm' || rawKind.includes('edm')) {
    return {
      ...styles.proofpointChipLarge,
      background: 'rgba(6, 182, 212, 0.82)',
      border: '1px solid rgba(165, 243, 252, 0.72)',
      color: '#ecfeff'
    };
  }

  if (rawType === 'classification' || rawKind === 'classification') {
    return {
      ...styles.proofpointChipLarge,
      background: 'rgba(168, 85, 247, 0.82)',
      border: '1px solid rgba(221, 214, 254, 0.7)',
      color: '#faf5ff'
    };
  }

  if (rawType === 'detector' || rawKind === 'detector' || rawKind.includes('detector')) {
    return {
      ...styles.proofpointChipLarge,
      background: 'rgba(225, 29, 72, 0.84)',
      border: '1px solid rgba(253, 164, 175, 0.72)',
      color: '#fff1f2'
    };
  }

  if (rawType === 'mip' || rawKind.includes('mip')) {
    return {
      ...styles.proofpointChipLarge,
      background: 'rgba(59, 130, 246, 0.88)',
      border: '1px solid rgba(147, 197, 253, 0.65)',
      color: '#eff6ff'
    };
  }

  return {
    ...styles.proofpointChipLarge,
    background: 'rgba(59, 130, 246, 0.88)',
    border: '1px solid rgba(147, 197, 253, 0.65)',
    color: '#eff6ff'
  };
}

function renderIndicatorRows(indicators: any[]) {
  const items = Array.isArray(indicators) ? indicators : [];
  if (!items.length) return null;

  const grouped = items.reduce((acc: Record<string, any[]>, indicator: any) => {
    const label = getIndicatorGroupLabel(indicator);
    if (!acc[label]) acc[label] = [];
    acc[label].push(indicator);
    return acc;
  }, {});

  const groupOrder = [
    'MIP',
    'SMARTID',
    'DATASET',
    'DICTIONARY',
    'AI CLASSIFIER',
    'FILESET',
    'IDM',
    'EDM',
    'CLASSIFICATION',
    'DETECTOR',
    'OUTROS'
  ];

  const sortedEntries = Object.entries(grouped).sort(([a], [b]) => {
    const aIndex = groupOrder.indexOf(a);
    const bIndex = groupOrder.indexOf(b);
    const safeA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
    const safeB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
    if (safeA !== safeB) return safeA - safeB;
    return a.localeCompare(b);
  });

  const getSortedGroupItems = (groupItems: any[]) => {
    return [...groupItems].sort((a: any, b: any) => {
      const matchDiff = Number(b?.matches || 0) - Number(a?.matches || 0);
      if (matchDiff !== 0) return matchDiff;
      return String(a?.name || '').localeCompare(String(b?.name || ''));
    });
  };

  return (
    <div style={{ ...styles.stack, minWidth: 0, width: 'fit-content', maxWidth: '100%', gap: 12 }}>
      {sortedEntries.map(([label, groupItems]) => {
        const sortedGroupItems = getSortedGroupItems(groupItems);
        return (
          <div
            key={label}
            style={{
              border: '1px solid rgba(96, 165, 250, 0.16)',
              borderRadius: 12,
              background: 'rgba(2, 6, 23, 0.38)',
              padding: 12,
              minWidth: 0,
              width: 'fit-content',
              maxWidth: '100%',
              boxSizing: 'border-box',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.01)'
            }}
          >
            <div style={styles.indicatorRow}>
              <div style={styles.indicatorLabel}>{label}</div>
              <div style={styles.indicatorChips}>
                {sortedGroupItems.map((indicator: any, index: number) => (
                  <span
                    key={`${label}-${String(indicator?.id || indicator?.name || index)}`}
                    style={getIndicatorChipStyle(indicator)}
                  >
                    {getIndicatorChipLabel(indicator)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getSeverityStyle(severity?: string | null): CSSProperties {
  const raw = String(severity || '').toLowerCase();

  if (raw.includes('high')) {
    return {
      background: 'rgba(127, 29, 29, 0.35)',
      border: '1px solid rgba(248, 113, 113, 0.45)',
      color: '#fecaca'
    };
  }

  if (raw.includes('medium')) {
    return {
      background: 'rgba(124, 45, 18, 0.35)',
      border: '1px solid rgba(251, 146, 60, 0.45)',
      color: '#fdba74'
    };
  }

  if (raw.includes('low')) {
    return {
      background: 'rgba(113, 63, 18, 0.35)',
      border: '1px solid rgba(250, 204, 21, 0.45)',
      color: '#fde68a'
    };
  }

  return {
    background: 'rgba(30, 41, 59, 0.6)',
    border: '1px solid rgba(148, 163, 184, 0.25)',
    color: '#cbd5e1'
  };
}


const styles = mergeStyles(sharedStyles, {
  page: sharedStyles.pageTwoColumns
});

export default function ApprovalsPage() {
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [selected, setSelected] = useState<ApprovalItem | null>(null);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);

    try {
      const approved = await apiFetch<ApprovalItem[]>('/api/approvals?status=APPROVED');
      const denied = await apiFetch<ApprovalItem[]>('/api/approvals?status=DENIED');
      const expired = await apiFetch<ApprovalItem[]>('/api/approvals?status=EXPIRED');

      const merged = [...approved, ...denied, ...expired].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setItems(merged);
      setSelected((current) => {
        if (!merged.length) return null;
        if (!current) return null;
        return merged.find((item) => item.id === current.id) || null;
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const preview = getPreview(item);

      return [
        item.requesterEmail || '',
        item.requesterName || '',
        item.deviceHostname || '',
        item.policyName || '',
        item.policyReason || '',
        item.messageSubject || '',
        item.messageSender || '',
        item.source || '',
        getPolicyTitle(item),
        preview?.user?.username || '',
        preview?.user?.displayName || '',
        preview?.incident?.name || '',
        preview?.incident?.description || ''
      ]
        .join(' ')
        .toLowerCase()
        .includes(filter.toLowerCase());
    });
  }, [items, filter]);

  const detailItem = useMemo(() => {
    if (!selected) return null;
    return filtered.find((item) => item.id === selected.id) || selected;
  }, [filtered, selected]);



  const approvalInfo = getApprovalInfo(detailItem);
  const emailApproval = isEmailApproval(detailItem);

  const userInfo = getUnifiedUserInfo(detailItem);
  const emailInfo = getUnifiedEmailInfo(detailItem);
  const endpointInfo = getUnifiedEndpointInfo(detailItem);
  const incidentInfo = getUnifiedIncidentInfo(detailItem);

  const resources = getUnifiedResources(detailItem);
  const indicators: ApprovalIndicator[] = getUnifiedIndicators(detailItem);
  const screenshots = getUnifiedScreenshots(detailItem);

  const referencedIndicatorIds = new Set(
    indicators
      .filter((indicator: ApprovalIndicator) => indicator.type === 'detector')
      .flatMap((indicator: ApprovalIndicator) =>
        Array.isArray(indicator.linkedIndicators)
          ? indicator.linkedIndicators.map((linked: ApprovalIndicator) => String(linked.id || ''))
          : []
      )
      .filter(Boolean)
  );

  const visibleIndicators = indicators.filter((indicator: ApprovalIndicator) => {
    if (indicator.type === 'detector') {
      return true;
    }

    return !referencedIndicatorIds.has(String(indicator.id || ''));
  });
    
  const detectorIndicators = visibleIndicators.filter(
    (indicator) => indicator.type === 'detector'
  );

  const groupedEmailResources = useMemo(() => {
    return groupEmailResourcesForDisplay(resources);
  }, [resources]);

  const visibleAttachmentGroups = useMemo(() => {
    return (groupedEmailResources.attachmentGroups || [])
      .map((group: any) => {
        const attachmentLabel = getSafeAttachmentLabel(group);
        const visibleItems = getVisibleResourceItems(group?.items || []);
        const hasHighlights = visibleItems.length > 0;

        return {
          ...group,
          attachmentLabel,
          visibleItems,
          hasHighlights
        };
      })
      .filter((group: any) => {
        return !isGenericEmailLabel(group.attachmentLabel) || group.visibleItems.length > 0;
      })
      .sort((a: any, b: any) => {
        if (a.hasHighlights === b.hasHighlights) {
          return String(a.attachmentLabel || '').localeCompare(String(b.attachmentLabel || ''));
        }

        return a.hasHighlights ? -1 : 1;
      });
  }, [groupedEmailResources]);

  const visibleStandaloneResources = useMemo(() => {
    return (groupedEmailResources.standalone || []).filter((resource: any) => {
      const sectionTitle = String(getEmailResourceSectionTitle(resource) || '').trim();
      const hasIndicators =
        getNonMipIndicators(resource).length > 0 ||
        getMipBadges(resource).length > 0;

      if (!hasIndicators) {
        return false;
      }

      return !isGenericEmailLabel(sectionTitle);
    });
  }, [groupedEmailResources]);
  
  return (
    <div style={styles.page}>
      <section style={styles.card}>
        <div style={styles.title}>Minhas aprovações</div>
        <div style={styles.subtitle}>
          Histórico de solicitações que já tiveram uma decisão.
        </div>  

        <div style={styles.toolbar}>
          <input
            style={styles.searchInput}
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Pesquisar por usuário, política, hostname ou e-mail"
          />
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
           <thead>
              <tr>
                <th style={{ ...styles.th, width: '25%' }}>Aprovado em</th>
                <th style={{ ...styles.th, width: '30%' }}>Solicitante</th>
                {/* <th style={{ ...styles.th, width: '20%' }}>Política</th> */}
                <th style={{ ...styles.th, width: '23%' }}>Fonte</th>
                <th style={{ ...styles.th, width: '20%' }}>Status</th>
                <th style={{ ...styles.th, width: '2%' }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const active = detailItem?.id === item.id;
                
                return (
                 <tr key={item.id} style={stylesForRow(active)}>
                  <td style={{ ...styles.td, whiteSpace: 'normal' }}>
                    {new Date(item.createdAt).toLocaleString('pt-BR')}
                  </td>

                  <td style={styles.td}>
                    <div
                      style={{
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                        overflowWrap: 'anywhere'
                      }}
                      title={
                        String(item.source || '').toUpperCase() === 'EMAIL_QUARANTINE'
                          ? (item.messageSender || item.requesterEmail || '-')
                          : (item.requesterEmail || '-')
                      }
                    >
                      {String(item.source || '').toUpperCase() === 'EMAIL_QUARANTINE'
                        ? (item.messageSender || item.requesterEmail || '-')
                        : (item.requesterEmail || '-')}
                    </div>
                  </td>

                  {/* 
                  <td style={styles.td}>
                    <div
                      style={{
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                        overflowWrap: 'anywhere'
                      }}
                      title={getPolicyTitle(item)}
                    >
                      {getPolicyTitle(item)}
                    </div>
                  </td> */}

                  <td style={styles.td}>{formatSourceLabel(item.source)}</td>
                  <td style={styles.td}>{formatStatusLabel(item.status)}</td>

                  <td style={styles.td}>
                    <button
                      style={{
                        ...(active ? styles.buttonActiveTable : styles.buttonTable),
                        minWidth: 115
                      }}
                      onClick={() => setSelected(item)}
                    >
                      {active ? 'Selecionado' : 'Detalhar'}
                    </button>
                  </td>
                </tr>
                );
              })}

              {!filtered.length ? (
                <tr>
                  <td style={styles.td} colSpan={6}>
                    <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                      {loading ? 'Carregando...' : 'Nenhuma aprovação encontrada.'}
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section style={styles.card}>
        <div style={styles.titleCenter}>Detalhes da aprovação</div>

        {!detailItem ? (
          <div style={styles.infoBox}>Selecione uma aprovação para ver os detalhes.</div>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={styles.badgeRow}>
              <span style={styles.badge}>{formatSourceLabel(detailItem.source)}</span>
              <span style={styles.badge}>{formatStatusLabel(detailItem.status)}</span>
              <span style={{ ...styles.badge, ...getSeverityStyle(incidentInfo?.severity) }}>
                Severidade: {formatIncidentSeverity(incidentInfo?.severity)}
              </span>
              <span style={styles.badge}>
                Status do incidente: {formatIncidentStatus(incidentInfo?.status)}
              </span>
            </div>

            <div style={styles.miniCard}>
              <div style={styles.sectionDivider}>Resumo do Incidente</div>
              <div style={{ display: 'grid', gap: 16, marginTop: 8 }}>
                <div style={styles.detailBlock}>
                  <div style={styles.detailLabel}>Política</div>
                  <div style={styles.detailValue}>{getPolicyTitle(detailItem)}</div>
                </div>

                <div style={styles.detailBlock}>
                  <div style={styles.detailLabel}>Motivo do bloqueio</div>
                  <div style={styles.detailValue}>{getBlockReason(detailItem)}</div>
                </div>

              </div>
            </div>

            <div style={styles.miniCard}>
              <div style={styles.sectionDivider}>Informações da mensagem </div>

              {emailApproval ? (
                <div style={{ display: 'grid', gap: 16, marginTop: 8 }}>
                  <div style={styles.detailBlock}>
                    <div style={styles.detailLabel}>Assunto</div>
                    <div style={styles.detailValue}>{emailInfo.subject || '-'}</div>
                  </div>

                  <div style={styles.detailBlock}>
                    <div style={styles.detailLabel}>Remetente</div>
                    <div style={styles.detailValue}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span>{emailInfo.sender || '-'}</span>
                        {(detailItem as any)?.payload?.senderIsVap ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '4px 10px',
                              borderRadius: '999px',
                              background: 'rgba(225, 29, 72, 0.18)',
                              border: '1px solid rgba(251, 113, 133, 0.45)',
                              color: '#fecdd3',
                              fontSize: '11px',
                              fontWeight: 800,
                              letterSpacing: '0.04em',
                              textTransform: 'uppercase',
                              lineHeight: 1.1
                            }}
                          >
                            Very Attacked People
                          </span>
                        ) : null}
                      </span>
                    </div>
                  </div>

                  <div style={styles.detailBlock}>
                    <div style={styles.detailLabel}>Destinatários</div>
                    <div style={styles.detailValue}>{(emailInfo.recipients || []).join(', ') || '-'}</div>
                  </div>

                  <div style={styles.detailBlock}>
                    <div style={styles.detailLabel}>Enviado em</div>
                    <div style={styles.detailValue}>
                      {emailInfo.sentAt ? new Date(emailInfo.sentAt).toLocaleString('pt-BR') : '-'}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div style={styles.labelGrid}>
                      <div style={styles.flowBox}>
                        <div style={styles.sectionTitle}>Usuário</div>
                        <div><strong>Email usuário:</strong> {userInfo.email || '-'}</div>
                        <div><strong>User Name:</strong> {userInfo.username || '-'}</div>
                        <div><strong>Display Name:</strong> {userInfo.displayName || '-'}</div>
                      </div>
                    </div>

                  <div style={{ ...styles.labelGrid, marginTop: 14 }}>
                    <div style={styles.flowBox}>
                      <div style={styles.sectionTitle}>Endpoint</div>
                      <div><strong>Hostname:</strong> {endpointInfo.hostname || '-'}</div>
                      <div><strong>Endpoint FQDN:</strong> {endpointInfo.fqdn || '-'}</div>
                      <div><strong>IP:</strong> {endpointInfo.ip || '-'}</div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div style={styles.miniCard}>
              <div style={styles.sectionDivider}>Detalhes da aprovação</div>
              <div style={{ display: 'grid', gap: 16, marginTop: 8 }}>
                <div style={styles.detailBlock}>
                  <div style={styles.detailLabel}>Aprovado/decidido em</div>
                  <div style={styles.detailValue}>
                    {approvalInfo.approvedAt
                      ? new Date(approvalInfo.approvedAt).toLocaleString('pt-BR')
                      : '-'}
                  </div>
                </div>

                <div style={styles.detailBlock}>
                  <div style={styles.detailLabel}>Comentário da decisão</div>
                  <div style={styles.detailValue}>{getDecisionComment(detailItem)}</div>
                </div>

                {approvalInfo?.expiresAt ? (
                  <>
                    <div style={styles.detailBlock}>
                      <div style={styles.detailLabel}>
                        {String(detailItem.status || '').toUpperCase() === 'EXPIRED'
                          ? 'Expirado em'
                          : 'Expira em'}
                      </div>
                      <div style={styles.detailValue}>{new Date(approvalInfo.expiresAt).toLocaleString('pt-BR')}</div>
                    </div>

                    {approvalInfo.removeAfterAt ? (
                      <div style={styles.detailBlock}>
                        <div style={styles.detailLabel}>Remoção automática em</div>
                        <div style={styles.detailValue}>{new Date(approvalInfo.removeAfterAt).toLocaleString('pt-BR')}</div>
                      </div>
                    ) : null}

                    {approvalInfo.grantStatus ? (
                      <div style={styles.detailBlock}>
                        <div style={styles.detailLabel}>Status</div>
                        <div style={styles.detailValue}>{approvalInfo.grantStatus}</div>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>

            <div style={styles.miniCard}>
              <div style={styles.sectionDivider}>Arquivos e conteúdo analisado</div>

              {!resources.length ? (
                <div style={{ color: '#94a3b8' }}>Nenhum arquivo relevante encontrado.</div>
              ) : emailApproval ? (
                <div style={styles.resourceCardWrap}>
                  {visibleAttachmentGroups.map((group: any, groupIdx: number) => {
                    const attachmentLabel = group.attachmentLabel;
                    const visibleItems = group.visibleItems;

                    return (
                      <div
                        key={`attachment-group-${attachmentLabel}-${groupIdx}`}
                        style={{
                          background: 'transparent',
                          border: '1px solid rgba(71, 85, 105, 0.35)',
                          borderRadius: 12,
                          padding: 10,
                          display: 'grid',
                          gap: 6,
                          alignContent: 'start'
                        }}
                      >
                        <div style={{
                          ...styles.kvLine,
                          marginBottom: 8
                        }}>
                          <span style={styles.kvKey}>Arquivo: </span>
                          <span
                            style={{
                              ...styles.kvValue,
                              color: visibleItems.length ? '#f87171' : styles.kvValue.color,
                              fontWeight: visibleItems.length ? 800 : styles.kvValue.fontWeight
                            }}
                          >
                            {attachmentLabel}
                          </span>
                        </div>

                        {visibleItems.length ? (() => {
                          const sectionTypes = new Set(
                            visibleItems.map((resource: any) => getEmailResourceSectionTitle(resource))
                          );
                          const shouldShowSectionTitle = sectionTypes.size > 1;

                          return (
                            <div style={{ display: 'grid', gap: 12, marginTop: 4, minWidth: 0 }}>
                              {visibleItems.map((resource: any, idx: number) => (
                                <div
                                  key={`${resource.id || resource.name || idx}`}
                                  style={{
                                    background: 'linear-gradient(180deg, #04153fde 0%, #132042bb 100%)',
                                    border: '1px solid #60a5fa1f',
                                    borderRadius: 12,
                                    padding: 12,
                                    display: 'grid',
                                    gap: 10,
                                    minWidth: 0,
                                    width: '100%',
                                    maxWidth: '100%',
                                    boxSizing: 'border-box',
                                    overflowX: 'hidden'
                                  }}
                                >
                                  {shouldShowSectionTitle ? (
                                    <div style={styles.kvLine}>
                                      <span style={styles.kvKey}>{getEmailResourceSectionTitle(resource)}</span>
                                    </div>
                                  ) : null}

                                  {(getMipBadges(resource).length || getNonMipIndicators(resource).length) ? (
                                    <div style={{ display: 'grid', gap: 10, minWidth: 0 }}>
                                      <div style={{ ...styles.sectionDivider, marginBottom: 0, paddingTop: 0 }}>Indicadores</div>
                                      <div style={{ ...styles.stack, minWidth: 0, width: 'fit-content', maxWidth: '100%', gap: 14 }}>
                                        {/* MIP row */}
                                        {getMipBadges(resource).length > 0 && (
                                          <div style={styles.indicatorRow}>
                                            <div style={styles.indicatorLabel}>MIP</div>
                                            <div style={styles.indicatorChips}>
                                              {getMipBadges(resource).map((badge, i) => (
                                                <span
                                                  key={`mip-${i}`}
                                                  style={{
                                                    ...styles.proofpointChipLarge,
                                                    background: 'rgba(59, 130, 246, 0.88)',
                                                    border: '1px solid rgba(147, 197, 253, 0.65)',
                                                    color: '#eff6ff'
                                                  }}
                                                >
                                                  {badge.label || '-'}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        {/* Non-MIP indicator rows */}
                                        {renderIndicatorRows(getNonMipIndicators(resource))}
                                      </div>
                                    </div>
                                  ) : null}

                                  {Array.isArray(resource.matchedFromKinds) && resource.matchedFromKinds.length ? (
                                    <div style={{ ...styles.resourceLocations, marginTop: 4 }}>
                                      Encontrado em:{' '}
                                      <span style={{ color: '#f87171', fontWeight: 800 }}>
                                        {formatMatchedFromKindsLabel(
                                          resource.matchedFromKinds,
                                          resource.locations
                                        )}
                                      </span>
                                    </div>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          );
                        })() : (
                          <div
                            style={{
                              ...getCleanAttachmentHintStyle(),
                              minHeight: 84,
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            Nenhum conteúdo sensível detectado neste arquivo.
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {visibleStandaloneResources.map((resource: any, idx: number) => (
                    <div
                      key={`standalone-${resource.id || resource.name || idx}`}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(71, 85, 105, 0.35)',
                        borderRadius: 12,
                        padding: 10,
                        display: 'grid',
                        gap: 6,
                        alignContent: 'start'
                      }}
                    >
                      {/* Derived analysis file header */}
                      {resource.resourceDisplayCategory === 'derived_analysis_file' && (
                        <div style={{ ...styles.kvLine, marginBottom: 8 }}>
                          <span style={styles.kvKey}>Arquivo analisado: </span>
                          <span style={{ color: '#f87171', fontWeight: 800 }}>
                            {String(
                              resource?.attachmentDisplayName || resource?.displayName || resource?.name || '-'
                            ).trim() || '-'}
                          </span>
                        </div>
                      )}
                      <div
                        style={{
                          background: 'linear-gradient(180deg, #04153fde 0%, #132042bb 100%)',
                          border: '1px solid #60a5fa1f',
                          borderRadius: 12,
                          padding: '10px 12px',
                          display: 'grid',
                          gap: 10,
                          minWidth: 0,
                          width: '100%',
                          maxWidth: '100%',
                          boxSizing: 'border-box',
                          overflowX: 'hidden'
                        }}
                      >
                        {(getMipBadges(resource).length || getNonMipIndicators(resource).length) ? (
                          <div style={{ display: 'grid', gap: 10, minWidth: 0 }}>
                            <div style={{ ...styles.sectionDivider, marginBottom: 0, paddingTop: 0 }}>Indicadores</div>
                            <div style={{ ...styles.stack, minWidth: 0, width: 'fit-content', maxWidth: '100%', gap: 14 }}>
                              {/* MIP row */}
                              {getMipBadges(resource).length > 0 && (
                                <div style={styles.indicatorRow}>
                                  <div style={styles.indicatorLabel}>MIP</div>
                                  <div style={styles.indicatorChips}>
                                    {getMipBadges(resource).map((badge, i) => (
                                      <span
                                        key={`mip-${i}`}
                                        style={{
                                          ...styles.proofpointChipLarge,
                                          background: 'rgba(59, 130, 246, 0.88)',
                                          border: '1px solid rgba(147, 197, 253, 0.65)',
                                          color: '#eff6ff'
                                        }}
                                      >
                                        {badge.label || '-'}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {/* Non-MIP indicator rows */}
                              {renderIndicatorRows(getNonMipIndicators(resource))}
                            </div>
                          </div>
                        ) : null}
                        {Array.isArray(resource.matchedFromKinds) && resource.matchedFromKinds.length ? (
                          <div style={{ ...styles.resourceLocations, marginTop: 4 }}>
                            Encontrado em:{' '}
                            <span style={{ color: '#f87171', fontWeight: 800 }}>
                              {formatMatchedFromKindsLabel(
                                resource.matchedFromKinds,
                                resource.locations
                              )}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    ...styles.resourceCardWrap,
                    marginTop: 0
                  }}
                >
                  {resources.map((resource) => (
                    <div
                      key={resource.id}
                      style={{
                        ...styles.flowBox,
                        minHeight: 170,
                        justifyContent: 'flex-start'
                      }}
                    >
                      <div style={styles.flowTitle}>{resource.actionType}</div>

                      {resource.showFlow ? (
                        <>
                          <div style={styles.flowArrow}>
                            {resource.sourceLabel} → {resource.destinationLabel}
                          </div>
                          <div style={styles.kvLine}>
                            <span style={styles.kvKey}>{resource.sourceLabel}:</span>{' '}
                            <span style={styles.kvValue}>{resource.sourceValue || '-'}</span>
                          </div>
                          <div style={styles.kvLine}>
                            <span style={styles.kvKey}>{resource.destinationLabel}:</span>{' '}
                            <span style={styles.kvValue}>{resource.destinationValue || '-'}</span>
                          </div>
                        </>
                      ) : null}

                      {(resource.fileNames ?? []).length ? (
                        <div style={{ marginTop: 10 }}>
                          <div style={styles.kvLine}>
                            <span style={styles.kvKey}>Arquivo: </span>

                            <span
                              style={{
                                color: '#33a0a8',
                                fontWeight: 600
                              }}
                            >
                              {(resource.fileNames ?? []).join(', ')}
                            </span>
                          </div>
                        </div>
                      ) : null}

                      {resource.linkedIndicators?.length ? (
                        <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                          {renderIndicatorRows(resource.linkedIndicators)}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {screenshots.length ? (
                <div style={styles.miniCard}>
                  <div style={styles.sectionDivider}>Screenshots</div>

                  <div style={styles.screenshotGrid}>
                    {screenshots.map((shot) => (
                      <div key={shot.id} style={styles.screenshotCard}>
                        {shot.publicUrl ? (
                          <img
                            src={shot.publicUrl}
                            alt={shot.windowTitle || shot.fileName || shot.id}
                            style={styles.screenshotImage}
                          />
                        ) : null}

                        <div style={styles.screenshotMeta}>
                          <div><strong>Janela:</strong> {shot.windowTitle || '-'}</div>
                          <div><strong>Aplicação:</strong> {shot.applicationName || '-'}</div>
                          <div><strong>Descrição:</strong> {shot.applicationDescription || '-'}</div>
                          <div><strong>Vendor:</strong> {shot.applicationVendor || '-'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
  
            {!emailApproval ? (
              <div style={styles.miniCard}>
                <div style={styles.sectionDivider}>Detectores</div>

                {detectorIndicators.length ? (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 10,
                      marginTop: 12
                    }}
                  >
                    {detectorIndicators.map((indicator, i) => {
                      const visual = getIndicatorVisual(indicator.type, indicator.kind);

                      return (
                        <span
                          key={`${indicator.id || indicator.name || 'detector'}-${i}`}
                          style={{
                            ...styles.proofpointChip,
                            backgroundColor: visual.backgroundColor,
                            border: visual.border,
                            color: visual.color
                          }}
                        >
                          {indicator.name || formatIndicatorKind(indicator.kind)}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ marginTop: 10, color: '#94a3b8' }}>
                    Sem detectores relevantes.
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}