'use client';

import { sharedStyles, mergeStyles, stylesForRow } from '../../../lib/ui-styles';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import ApprovalDecisionDialog from '../../../components/ApprovalDecisionDialog';
import { apiFetch } from '../../../lib/api';
import { ApprovalItem } from '../../../lib/types';
import {
  getBlockReason,
  getIndicators,
  getPolicyTitle,
  getPreview,
  getResourceCards,
  getScreenshots,
  getIndicatorVisual,
  formatIncidentSeverity,
  formatIncidentStatus,
  formatSourceLabel,
  formatStatusLabel,
  getFlowIndicatorsFromResource,
  formatBytesForFlow,
  getResourceExtensionLabel,
  getScreenshotApplicationNameForResource
} from '../../../lib/helpers-preview';

import EndpointActivityFlowCard from '../../../components/EndpointActivityFlowCard';
import { showErrorAlert, showSuccessAlert } from '../../../lib/alerts';

  type MessageKind = 'info' | 'error';
  type RangePreset = '1h' | '24h' | '7d' | '30d' | 'custom';
  type CustomUnit = 'minutes' | 'hours' | 'days' | 'weeks';


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


  function getRangeStartDate(
    preset: RangePreset,
    customValue: number,
    customUnit: CustomUnit
  ): Date {
    const now = new Date();

    if (preset === '1h') {
      return new Date(now.getTime() - 60 * 60 * 1000);
    }

    if (preset === '24h') {
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    if (preset === '7d') {
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    if (preset === '30d') {
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const safeValue = Math.max(1, Number(customValue) || 1);

    if (customUnit === 'minutes') {
      return new Date(now.getTime() - safeValue * 60 * 1000);
    }

    if (customUnit === 'hours') {
      return new Date(now.getTime() - safeValue * 60 * 60 * 1000);
    }

    if (customUnit === 'days') {
      return new Date(now.getTime() - safeValue * 24 * 60 * 60 * 1000);
    }

    return new Date(now.getTime() - safeValue * 7 * 24 * 60 * 60 * 1000);
  }


  const styles = mergeStyles(sharedStyles, {
    page: sharedStyles.pageTwoColumns
  });


  function getFlowIndicators(resource: any) {
    return getFlowIndicatorsFromResource(resource);
  }

  function getFlowDetectors(resource: any, allIndicators: any[]) {
    const resourceLinkedIndicators = Array.isArray(resource?.linkedIndicators)
      ? resource.linkedIndicators
      : [];

    if (!resourceLinkedIndicators.length || !Array.isArray(allIndicators) || !allIndicators.length) {
      return [];
    }

    const resourceIndicatorIds = new Set(
      resourceLinkedIndicators
        .map((indicator: any) => String(indicator?.id || '').trim())
        .filter(Boolean)
    );

    const matchedDetectors = allIndicators.filter((indicator: any) => {
      const type = String(indicator?.type || '').toLowerCase();

      if (type !== 'detector') {
        return false;
      }

      const linked = Array.isArray(indicator?.linkedIndicators)
        ? indicator.linkedIndicators
        : [];

      return linked.some((linkedIndicator: any) =>
        resourceIndicatorIds.has(String(linkedIndicator?.id || '').trim())
      );
    });

    return matchedDetectors.length
      ? [
          {
            type: 'detector',
            label: 'DETECTORES',
            items: matchedDetectors.map((indicator: any) => ({
              id: indicator?.id,
              name: indicator?.name,
              type: indicator?.type,
              kind: indicator?.kind,
              matches: typeof indicator?.matches === 'number' ? indicator.matches : null
            }))
          }
        ]
      : [];
  }

  function getResourcePrimaryFileName(resource: any) {
    if (Array.isArray(resource?.fileNames) && resource.fileNames.length) {
      return String(resource.fileNames[0] || '').trim() || '-';
    }

    return String(resource?.name || '').trim() || '-';
  }

  function mapActionToTargetType(actionType?: string, destinationValue?: string) {
    const action = String(actionType || '').toLowerCase();
    const destination = String(destinationValue || '').toLowerCase();

    if (action.includes('web file upload')) return 'web';
    if (action.includes('network')) return 'network';
    if (action.includes('usb')) return 'usb';
    if (action.includes('clipboard')) return 'clipboard';
    if (action.includes('bluetooth')) return 'bluetooth';
    if (action.includes('airdrop')) return 'airdrop';
    if (action.includes('sync')) return 'sync';
    if (action.includes('media')) return 'media';
    if (action.includes('genai')) return 'genai';
    if (destination.startsWith('http')) return 'web';

    return 'unknown';
  }

  function buildSourceSecondary(resource: any) {
    const sourcePath =
      resource?.sourceValue ||
      resource?.path ||
      resource?._derivatives?.direction?.source?.path ||
      null;

    if (!sourcePath) return undefined;

    const primaryFileName = getResourcePrimaryFileName(resource);
    const normalizedPath = String(sourcePath).trim();

    if (normalizedPath === primaryFileName) {
      return undefined;
    }

    return normalizedPath;
  }


  function buildSourceMeta(resource: any) {
    const parts: string[] = [];

    if (resource?.kind) {
      parts.push(String(resource.kind).toLowerCase());
    }

    const extensionLabel = getResourceExtensionLabel(resource);
    if (extensionLabel) {
      parts.push(extensionLabel);
    }

    const sizeLabel = formatBytesForFlow(resource?.size);
    if (sizeLabel) {
      parts.push(sizeLabel);
    }

    return parts.length ? parts.join('  •  ') : undefined;
  }
  
  function buildFlowCardData(resource: any, screenshots: any[], allIndicators: any[]) {
    const actionTitle = resource?.actionType || 'Activity';

    const primaryFileName = getResourcePrimaryFileName(resource);

    const applicationName =
      getScreenshotApplicationNameForResource(resource, screenshots) ||
      resource?.applicationName ||
      undefined;

    const targetLabel =
      resource?.destinationValue ||
      resource?.target ||
      '-';

    const source = {
      type: 'file' as const,
      title: 'Origem',
      label: primaryFileName,
      secondaryLabel: buildSourceSecondary(resource),
      meta: buildSourceMeta(resource),
      indicators: getFlowIndicators(resource),
      detectors: getFlowDetectors(resource, allIndicators)
    };

    const hasTarget =
      Boolean(resource?.showFlow) ||
      Boolean(resource?.destinationValue) ||
      Boolean(resource?.target);

    const target = hasTarget
      ? {
          type: mapActionToTargetType(resource?.actionType, resource?.destinationValue) as
            | 'web'
            | 'network'
            | 'usb'
            | 'clipboard'
            | 'bluetooth'
            | 'airdrop'
            | 'sync'
            | 'media'
            | 'genai'
            | 'unknown',
          title: 'Destino',
          label: targetLabel
        }
      : null;

    return {
      title: actionTitle,
      applicationName,
      source,
      target
    };
  }

  export default function EndpointItmPage() {
    const [items, setItems] = useState<ApprovalItem[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageKind, setMessageKind] = useState<MessageKind>('info');
    const [dialogItem, setDialogItem] = useState<ApprovalItem | null>(null);
    const [decisionBusy, setDecisionBusy] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [rangePreset, setRangePreset] = useState<RangePreset>('7d');
    const [appliedRangePreset, setAppliedRangePreset] = useState<RangePreset>('7d');

    const [customValue, setCustomValue] = useState<number>(10);
    const [customUnit, setCustomUnit] = useState<CustomUnit>('days');
    const [appliedCustomValue, setAppliedCustomValue] = useState<number>(10);
    const [appliedCustomUnit, setAppliedCustomUnit] = useState<CustomUnit>('days');


    async function loadItems(filterOverride?: {
      preset: RangePreset;
      customValue?: number;
      customUnit?: CustomUnit;
    }) {
    setLoading(true);
    setMessage('');
    setMessageKind('info');

    try {
      const effectivePreset = filterOverride?.preset || appliedRangePreset;
      const effectiveCustomValue = filterOverride?.customValue ?? appliedCustomValue;
      const effectiveCustomUnit = filterOverride?.customUnit ?? appliedCustomUnit;

      const startDate = getRangeStartDate(
        effectivePreset,
        effectiveCustomValue,
        effectiveCustomUnit
      );

      const endpoint = await apiFetch<ApprovalItem[]>('/api/approvals?source=ENDPOINT_ITM&status=PENDING');
      const dlp = await apiFetch<ApprovalItem[]>('/api/approvals?source=DLP&status=PENDING');

      const merged = [...endpoint, ...dlp]
        .filter((item) => new Date(item.createdAt).getTime() >= startDate.getTime())
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setItems(merged);

      if (!merged.length) {
        setMessage('Nenhum item pendente de Endpoint / DLP.');
        setMessageKind('info');
      }
    } catch (error: any) {
      setItems([]);
      setMessage(error?.message || 'Erro ao carregar a fila.');
      setMessageKind('error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadItems();
  }, []);

  useEffect(() => {
    if (rangePreset !== 'custom') {
      setAppliedRangePreset(rangePreset);
      void loadItems({ preset: rangePreset });
    }
  }, [rangePreset]);

  const filteredItems = useMemo(() => {
    
    const q = searchTerm.trim().toLowerCase();

    if (!q) return items;

    return items.filter((item) => {
      const preview = getPreview(item);
      return [
        item.requesterEmail || '',
        item.requesterName || '',
        item.deviceHostname || '',
        item.policyName || '',
        preview?.user?.username || '',
        preview?.user?.displayName || ''
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [items, searchTerm]);

  const selected = useMemo(
    () => filteredItems.find((item) => item.id === selectedId) || null,
    [filteredItems, selectedId]
  );

  useEffect(() => {
    if (!filteredItems.length) {
      setSelectedId(null);
      return;
    }

    const exists = filteredItems.some((item) => item.id === selectedId);
    if (!exists) {
      setSelectedId(null);
    }
  }, [filteredItems, selectedId]);


  async function denyItem(itemId: string, comment: string): Promise<void> {
    setDecisionBusy(true);

    try {
      await apiFetch(`/api/approvals/${itemId}/deny`, {
        method: 'POST',
        body: JSON.stringify({ comment })
      });

      const successMessage = 'Solicitação marcada como não aprovada.';

      setMessage(successMessage);
      setMessageKind('info');
      setDialogItem(null);

      await showSuccessAlert('Decisão concluída', successMessage);
      await loadItems();
    } catch (error: any) {
      const errorMessage = error?.message || 'Erro ao negar solicitação.';

      setMessage(errorMessage);
      setMessageKind('error');

      await showErrorAlert('Erro ao negar', errorMessage);
    } finally {
      setDecisionBusy(false);
    }
  }

  async function approveItem(itemId: string, durationHours: number, comment: string): Promise<void> {
    setDecisionBusy(true);

    try {
      await apiFetch(`/api/approvals/${itemId}/approve`, {
        method: 'POST',
        body: JSON.stringify({
          comment,
          durationHours
        })
      });

      const successMessage =
        durationHours === 1 / 60
          ? 'Solicitação aprovada com sucesso para 1 minuto.'
          : durationHours === 1
            ? 'Solicitação aprovada com sucesso para 1 hora.'
            : durationHours === 6
              ? 'Solicitação aprovada com sucesso para 6 horas.'
              : 'Solicitação aprovada com sucesso.';

      setMessage(successMessage);
      setMessageKind('info');
      setDialogItem(null);

      await showSuccessAlert('Aprovação concluída', successMessage);
      await loadItems();
    } catch (error: any) {
      const errorMessage = error?.message || 'Erro ao aprovar solicitação.';

      setMessage(errorMessage);
      setMessageKind('error');

      await showErrorAlert('Erro ao aprovar', errorMessage);
    } finally {
      setDecisionBusy(false);
    }
  }

  const preview = getPreview(selected);
  const indicators = getIndicators(selected);
  const resources = getResourceCards(selected);
  const screenshots = getScreenshots(selected);
  const incident = preview?.incident || {};
  const user = preview?.user || {};
  const endpoint = preview?.endpoint || {};
  const referencedIndicatorIds = new Set(
    indicators
      .filter((indicator) => indicator.type === 'detector')
      .flatMap((indicator) =>
        Array.isArray(indicator.linkedIndicators)
          ? indicator.linkedIndicators.map((linked) => String(linked.id || ''))
          : []
      )
      .filter(Boolean)
  );

  const visibleIndicators = indicators.filter((indicator) => {
    if (indicator.type === 'detector') {
      return true;
    }

    return !referencedIndicatorIds.has(String(indicator.id || ''));
  });

  const detectorIndicators = visibleIndicators.filter(
    (indicator) => indicator.type === 'detector'
  );

  
  return (
    <>
      <div style={styles.page}>
        <section style={styles.card}>
          <div style={styles.subtitle}>
            Eventos de Endpoint da Proofpoint no período selecionado.

          </div>

          <div style={styles.rangeRow}>
            {[
              { key: '1h', label: '1 hora' },
              { key: '24h', label: '24 horas' },
              { key: '7d', label: '7 dias' },
              { key: '30d', label: '30 dias' },
              { key: 'custom', label: 'Custom' }
            ].map((option, index, array) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setRangePreset(option.key as RangePreset)}
                style={{
                  ...styles.rangeButton,
                  ...(rangePreset === option.key ? styles.rangeButtonActive : {}),
                  borderRight:
                    index === array.length - 1
                      ? 'none'
                      : '1px solid rgba(96, 165, 250, 0.12)'
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          {rangePreset === 'custom' ? (
            <>
              <div style={styles.customLabel}>Custom</div>
              <div style={styles.customRow}>
                <input
                  type="number"
                  min={1}
                  value={customValue}
                  onChange={(event) => setCustomValue(Number(event.target.value) || 1)}
                  style={styles.customInput}
                />

                <div style={styles.segmented}>
                  {(['minutes', 'hours', 'days', 'weeks'] as CustomUnit[]).map((unit, index, array) => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => setCustomUnit(unit)}
                      style={{
                        ...styles.segmentedButton,
                        ...(customUnit === unit ? styles.segmentedButtonActive : {}),
                        borderRight:
                          index === array.length - 1
                            ? 'none'
                            : '1px solid rgba(96, 165, 250, 0.12)'
                      }}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          <input
            style={styles.searchInput}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Pesquisar por usuário, hostname ou política"
          />

          <div style={styles.toolbar}>
            <button
              style={styles.button}
              onClick={() => {
                setAppliedRangePreset(rangePreset);
                setAppliedCustomValue(customValue);
                setAppliedCustomUnit(customUnit);

                void loadItems({
                  preset: rangePreset,
                  customValue,
                  customUnit
                });
              }}
              disabled={loading}
            >
              Atualizar
            </button>

            <button
                type="button"
                style={styles.primaryButton}
                onClick={() => selected && setDialogItem(selected)}
                disabled={!selected || loading}
              >
                Decidir
            </button>
          </div>

          {message ? (
            <div style={messageKind === 'error' ? styles.messageError : styles.messageInfo}>
              {message}
            </div>
          ) : null}


          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, width: '25%' }}>Criado em</th>
                  <th style={{ ...styles.th, width: '25%' }}>Usuário</th>
                  <th style={{ ...styles.th, width: '25%' }}>Hostname</th>
                  {/* <th style={{ ...styles.th, width: '20%' }}>Política</th> */}
                  <th style={{ ...styles.th, width: '23%' }}>Fonte</th>
                  <th style={{ ...styles.th, width: '2%' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const active = selectedId === item.id;

                  return (
                   <tr key={item.id} style={stylesForRow(active)}>
                      <td style={styles.td}>
                        {new Date(item.createdAt).toLocaleString('pt-BR')}
                      </td>

                      <td style={styles.td}>
                        <div
                          style={{
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                            overflowWrap: 'anywhere'
                          }}
                          title={item.requesterName || '-'}
                        >
                          {item.requesterName || '-'}
                        </div>
                      </td>

                      <td style={styles.td}>
                        <div
                          style={{
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                            overflowWrap: 'anywhere'
                          }}
                          title={item.deviceHostname || '-'}
                        >
                          {item.deviceHostname || '-'}
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
                      </td>*/}
 
                      <td style={styles.td}>
                        {formatSourceLabel(item.source)}
                      </td>

                      <td style={styles.td}>
                        <button
                           style={{
                            ...(active ? styles.buttonActiveTable : styles.buttonTable),
                            minWidth: 115
                          }}
                          onClick={() => setSelectedId(item?.id ?? null)}
                        >
                          {active ? 'Selecionado' : 'Detalhar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {!filteredItems.length ? (
                  <tr>
                    <td style={styles.td} colSpan={6}>
                      <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                        {loading ? 'Carregando...' : 'Nenhum item encontrado.'}
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section style={styles.card}>
          <div style={styles.title}>Detalhes do bloqueio</div>

          {!selected ? (
            <div style={styles.subtitle}>Selecione um item para visualizar os detalhes.</div>
          ) : (
          
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={styles.badgeRow}>
                <span style={{ ...styles.badge, ...getSeverityStyle(incident?.severity) }}>
                  Severidade: {formatIncidentSeverity(incident?.severity)}
                </span>
                <span style={styles.badge}>
                  Status do incidente: {formatIncidentStatus(incident?.status)}
                </span>
                <span style={styles.badge}>
                  Status da solicitação: {formatStatusLabel(selected.status)}
                </span>
              </div>

              <div style={styles.miniCard}>
                <div style={styles.sectionDivider}>Resumo Incidente</div><br />
                  <div style={styles.flowBox}>
                    <div style={styles.labelGrid}>
                      <div><strong>Política:</strong> {getPolicyTitle(selected)}</div>
                      <div><strong>Motivo do bloqueio:</strong> {getBlockReason(selected)}</div>
                      <div><strong>Ocorrido em:</strong> {preview?.occurredAt ? new Date(preview.occurredAt).toLocaleString('pt-BR') : '-'}</div>
                    </div>
                  </div>
              </div>

              <div style={styles.miniCard}>
                <div style={styles.sectionDivider}>Informações do Usuário/Endpoint</div><br />
                  <div style={styles.flowBox}>
                      <div style={styles.labelGrid}>
                          <div style={styles.sectionTitle}>Endpoint</div>
                          <div><strong>Hostname:</strong> {endpoint?.hostname || selected.deviceHostname || '-'}</div>
                          <div><strong>Endpoint FQDN:</strong> {endpoint?.fqdn || '-'}</div>
                          <div><strong>IP:</strong> {endpoint?.ip || '-'}</div>
                      </div>
                  </div><br />


                <div style={styles.labelGrid}>
                    <div style={styles.flowBox}>
                      <div style={styles.sectionTitle}>Usuário</div>
                      <div><strong>Email usuário:</strong> {selected.requesterEmail || '-'}</div>
                      <div><strong>Display Name:</strong> {user?.displayName || selected.requesterName || '-'}</div>
                    </div>
                </div>
              </div> 

              <div style={styles.miniCard}>
                <div style={styles.sectionDivider}>Arquivos e conteúdo analisado</div><br />
                {!resources.length ? (
                  <div style={{ color: '#94a3b8' }}>Nenhum arquivo relevante encontrado.</div>
                ) : (
                  <div style={{ display: 'grid', gap: 12 }}>
                  {resources.map((resource) => {
                    const flowCard = buildFlowCardData(resource, screenshots, indicators);

                    return (
                      <EndpointActivityFlowCard
                        key={resource.id}
                        title={flowCard.title}
                        applicationName={flowCard.applicationName}
                        source={flowCard.source}
                        target={flowCard.target}
                        getIndicatorVisual={getIndicatorVisual}
                      />
                    );
                  })}
                  </div>
                )}
              </div>
              
            
            
            {screenshots.length ? (
                <div style={styles.miniCard}>
                  <div style={styles.sectionDivider}>Screenshots</div><br />

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
            </div>
          )}
        </section>
      </div>

      <ApprovalDecisionDialog
        open={Boolean(dialogItem)}
        itemLabel={
          dialogItem
            ? `${getPolicyTitle(dialogItem)} · ${dialogItem.requesterEmail || '-'}`
            : ''
        }
        busy={decisionBusy}
        onClose={() => setDialogItem(null)}
        onDeny={(comment) => (dialogItem ? denyItem(dialogItem.id, comment) : Promise.resolve())}
        onApprove1m={(comment) => (dialogItem ? approveItem(dialogItem.id, 1 / 60, comment) : Promise.resolve())}
        onApprove1h={(comment) => (dialogItem ? approveItem(dialogItem.id, 1, comment) : Promise.resolve())}
        onApprove6h={(comment) => (dialogItem ? approveItem(dialogItem.id, 6, comment) : Promise.resolve())}
      />
    </>
  );
}