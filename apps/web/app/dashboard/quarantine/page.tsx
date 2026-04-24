'use client';

import { Suspense, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'next/navigation';
import { sharedStyles, mergeStyles } from '../../../lib/ui-styles';
import {
  formatMatchedFromKindsLabel,
  getMipBadges,
  getNonMipIndicators,
  dedupeIndicators,
  groupEmailResourcesForDisplay,
  getEmailResourceSectionTitle
} from '../../../lib/helpers-preview';
import RoundCheckbox from '../../../components/RoundCheckbox';
import {
  showApproveConfirmAlert,
  showErrorAlert,
  showSuccessAlert
} from '../../../lib/alerts';

type Indicator = {
  id?: string;
  name?: string;
  kind?: string;
  type?: string;
  matches?: number;
  linkedIndicators?: Indicator[];
  objectKind?: string;
  objectName?: string;
};

type ResourceClassificationBadge = {
  label?: string;
  type?: string;
  rawKind?: string;
};

type Resource = {
  id?: string;
  name?: string;
  kind?: string;
  locations?: string[];
  matchedFromKinds?: string[];
  classificationBadges?: ResourceClassificationBadge[];
  linkedIndicators?: Indicator[];
};

type EmailItem = {
  id: string;
  fqid?: string | null;
  observedAt?: string | null;
  sentAt?: string | null;
  subject?: string;
  senderEmail?: string;
  senderDisplayName?: string;
  senderIsVap?: boolean;
  recipients?: string[];
  folder?: string;
  incidentKind?: string;
  incidentStatus?: string;
  incidentSeverity?: string;
  incidentReasons?: {
    id?: string;
    name?: string;
    alias?: string;
    description?: string;
    severity?: string;
  }[];
  userEmail?: string;
  userName?: string;
  indicators?: Indicator[];
  resources?: Resource[];
  attachments?: string[];
  rawEvent?: any;
};

type ApiResponse = {
  total?: number;
  items?: EmailItem[];
};

type PresetType = '1h' | '24h' | '7d' | '30d' | 'custom';
type CustomUnit = 'minutes' | 'hours' | 'days' | 'weeks';

const styles = mergeStyles(sharedStyles, {
  page: sharedStyles.pageSidebarDetail
});

function isResourceHighlighted(resource: any) {
  return getMipBadges(resource).length > 0 || getNonMipIndicators(resource).length > 0;
}



function isGenericEmailLabel(value?: string) {
  const normalized = String(value || '').trim().toLowerCase();
  return !normalized || normalized === 'arquivo' || normalized === 'file' || normalized === 'subject' || normalized === 'metadata' || normalized === 'body';
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
              background: 'linear-gradient(180deg, #04153fde 0%, #132042bb 100%)',
              padding: 12,
              minWidth: 0,
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.01)'
            }}
          >
            <div style={styles.indicatorRow}>
              <div style={styles.indicatorLabel}>
                {label}
              </div>

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

function renderMipRows(badges: any[]) {
  const items = Array.isArray(badges) ? badges : [];
  if (!items.length) return null;

  return (
    <div style={{ ...styles.stack, minWidth: 0, width: 'fit-content', maxWidth: '100%', gap: 12 }}>
      <div
        style={{
          border: '1px solid rgba(96, 165, 250, 0.16)',
          borderRadius: 12,
          background: 'linear-gradient(180deg, #04153fde 0%, #132042bb 100%)',
          padding: 12,
          minWidth: 0,
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.01)'
        }}
      >
        <div style={styles.indicatorRow}>
          <div style={styles.indicatorLabel}>MIP</div>
          <div style={styles.indicatorChips}>
            {items.map((badge: any, index: number) => (
              <span
                key={`mip-${index}`}
                style={{
                  ...styles.proofpointChipLarge,
                  background: 'rgba(59, 130, 246, 0.88)',
                  border: '1px solid rgba(147, 197, 253, 0.65)',
                  color: '#eff6ff'
                }}
              >
                {badge?.label || '-'}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


  function formatSeverityLabel(severity?: string) {
    const s = String(severity || '').toLowerCase();

    if (!s) return '-';

    if (s.includes('critical')) return 'Critical';
    if (s.includes('high')) return 'High';
    if (s.includes('medium')) return 'Medium';
    if (s.includes('low')) return 'Low';
    

    return severity;
  }

  function severityColor(severity?: string) {
    const normalized = String(severity || '').toLowerCase();

    if (normalized.includes('critical')) return '#ff0000';      // vermelho
    if (normalized.includes('high')) return '#ef4444';      // vermelho
    if (normalized.includes('medium')) return '#f97316';    // laranja
    if (normalized.includes('low')) return '#eab308';       // amarelo

    return '#94a3b8'; // default cinza
  }


function QuarantinePageContent() {
  const searchParams = useSearchParams();
  const fqidFromUrl = searchParams.get('fqid');
  const [items, setItems] = useState<EmailItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState<'info' | 'error'>('info');
  const [searchTerm, setSearchTerm] = useState('');

  const [preset, setPreset] = useState<PresetType>('7d');
  const [appliedPreset, setAppliedPreset] = useState<PresetType>('7d');

  const [customValue, setCustomValue] = useState<number>(10);
  const [customUnit, setCustomUnit] = useState<CustomUnit>('days');
  const [appliedCustomValue, setAppliedCustomValue] = useState<number>(10);
  const [appliedCustomUnit, setAppliedCustomUnit] = useState<CustomUnit>('days');
  const [justification, setJustification] = useState('');


  async function loadItems(filterOverride?: {
    preset: PresetType;
    customValue?: number;
    customUnit?: CustomUnit;
  }) {
    setLoading(true); 
    setMessage('');
    setMessageKind('info');

    try {
      const effectivePreset = filterOverride?.preset || appliedPreset;
      const effectiveCustomValue = filterOverride?.customValue ?? appliedCustomValue;
      const effectiveCustomUnit = filterOverride?.customUnit ?? appliedCustomUnit;

      const params = new URLSearchParams();
      params.set('preset', effectivePreset);

      if (effectivePreset === 'custom') {
        params.set('customValue', String(effectiveCustomValue || 1));
        params.set('customUnit', effectiveCustomUnit === 'minutes' ? 'hours' : effectiveCustomUnit);
      }

      const url = `/api/quarantine/my-items?${params.toString()}`;
      console.log('[quarantine] request url ->', url);

      const res = await fetch(url, {
        credentials: 'include'
      });

      const rawText = await res.text();
      console.log('[quarantine] response status ->', res.status);
      console.log('[quarantine] response raw ->', rawText);

      let data: ApiResponse | any = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch (parseError) {
        console.error('[quarantine] erro ao fazer parse do JSON ->', parseError);
        throw new Error('Resposta inválida do backend.');
      }

      console.log('[quarantine] response json ->', data);

      if (!res.ok) {
        const backendMessage =
          data?.message ||
          data?.error ||
          `Erro HTTP ${res.status}`;

        if (res.status === 401 || res.status === 403 || res.status >= 500) {
          throw new Error('Erro de configuração, contate o administrador.');
        }

        throw new Error(backendMessage);
      }

      const normalized = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
          ? data
          : [];

      console.log('[quarantine] normalized items ->', normalized);

      setItems(normalized);
      setChecked({});

      if (normalized.length === 0) {
        setMessage('Nenhuma mensagem encontrada para o período selecionado.');
      } else {
        setMessage(`Fila atualizada com ${normalized.length} mensagem(ns).`);
      }

      setMessageKind('info');
    } catch (error: any) {
      console.error('[quarantine] loadItems error ->', error);
      setItems([]);
      setSelectedId(null);
      setChecked({});
      setMessage(error?.message || 'Erro inesperado ao carregar a fila.');
      setMessageKind('error');
    } finally {
      setLoading(false);
    }
  }

  async function loadItemByFqid(fqid: string) {
    setLoading(true);
    setMessage('');
    setMessageKind('info');

    try {
      const res = await fetch(`/api/quarantine/by-fqid?fqid=${encodeURIComponent(String(fqid || ''))}`, {
        credentials: 'include'
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data) {
        throw new Error('O evento informado no link nao foi encontrado ou nao esta mais disponivel.');
      }

      setItems([data]);
      setChecked({});
      setSelectedId(data.id);
      setMessage('Mensagem específica selecionada via link de notificação.');
      setMessageKind('info');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (_err) {
      setItems([]);
      setSelectedId(null);
      setChecked({});
      setMessage('O evento informado no link nao foi encontrado ou nao esta mais disponivel.');
      setMessageKind('error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (fqidFromUrl) {
      return;
    } 

    void loadItems();
  }, [fqidFromUrl]);

  useEffect(() => {
    if (!fqidFromUrl) {
      return;
    }

    let cancelled = false;

    async function fetchByFqid() {
      if (cancelled) return;
      await loadItemByFqid(String(fqidFromUrl || ''));
    }

    void fetchByFqid();

    return () => {
      cancelled = true;
    };
  }, [fqidFromUrl]);

  useEffect(() => {
    if (fqidFromUrl) {
      return;
    }

    if (preset !== 'custom') {
      setAppliedPreset(preset);
      void loadItems({ preset });
    }
  }, [preset, fqidFromUrl]);
  // Fallback effect removed

  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    if (!q) return items;

    return items.filter((item) => {
      const subject = String(item.subject || '').toLowerCase();
      const sender = [item.senderDisplayName, item.senderEmail]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const recipients = (item.recipients || []).join(' ').toLowerCase();
      const folder = String(item.folder || '').toLowerCase();

      return (
        subject.includes(q) ||
        sender.includes(q) ||
        recipients.includes(q) ||
        folder.includes(q)
      );
    });
  }, [items, searchTerm]);

  const selected = useMemo(
    () => filteredItems.find((item) => item.id === selectedId) || null,
    [filteredItems, selectedId]
  );


    const groupedEmailResources = useMemo(() => {
      return groupEmailResourcesForDisplay(selected?.resources || []);
    }, [selected]);

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


  const selectedItems = useMemo(
    () => filteredItems.filter((item) => checked[item.id]),
    [filteredItems, checked]
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

  const canApprove = selectedItems.length > 0 && !loading;

  function toggleCheck(id: string) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleApproveClick() {
    if (!canApprove) return;

    const result = await showApproveConfirmAlert({
      count: selectedItems.length,
      requireJustification: true,
      initialValue: justification
    });

    if (!result.confirmed) return;

    setJustification(result.justification);
    await approveSelected(result.justification);
  }

  async function approveSelected(approvalJustification: string) {
    const payloadItems = selectedItems
      .filter((item) => item.fqid)
      .map((item) => ({
        fqid: item.fqid!,
        justification: approvalJustification,
        emailItem: item
      }));

    if (payloadItems.length === 0) return;

    setLoading(true);
    try {
      const endpoint =
        payloadItems.length === 1
          ? '/api/quarantine/approve'
          : '/api/quarantine/bulk-approve';

      const body =
        payloadItems.length === 1
          ? payloadItems[0]
          : { items: payloadItems };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || 'Erro ao aprovar mensagem(ns).');
      }
      
      if (data?.skippedAlreadyApproved?.length) {
        const errorMessage =
          `Algumas mensagens não foram aprovadas porque já estavam aprovadas: ${data.skippedAlreadyApproved.join(', ')}`;

        setMessage(errorMessage);
        setMessageKind('error');

        await showErrorAlert('Falha parcial na aprovação', errorMessage);
      } else {
        const successMessage =
          payloadItems.length === 1
            ? 'Email aprovado com sucesso.'
            : 'Emails aprovados com sucesso.';

        setMessage(successMessage);
        setMessageKind('info');
        setJustification('');
        
        await showSuccessAlert('Email aprovado com sucesso', successMessage);
      }

      setSelectedId(null);
      setChecked({});     
      await loadItems();
    } catch (error: any) {
      const errorMessage = error?.message || 'Erro ao aprovar mensagem(ns).';

      setMessage(errorMessage);
      setMessageKind('error');

      await showErrorAlert('Erro ao aprovar', errorMessage);
    } finally {
      setLoading(false);
    }
  }

  function applyCustomFilter() {
    const normalizedValue = Number.isFinite(customValue) && customValue > 0 ? customValue : 1;
    setCustomValue(normalizedValue);
    setAppliedPreset('custom');
    setAppliedCustomValue(normalizedValue);
    setAppliedCustomUnit(customUnit);
    void loadItems({
      preset: 'custom',
      customValue: normalizedValue,
      customUnit
    });
  }

  const quickOptions: { key: PresetType; label: string }[] = [
    { key: '1h', label: '1 hora' },
    { key: '24h', label: '24 horas' },
    { key: '7d', label: '7 dias' },
    { key: '30d', label: '30 dias' },
    { key: 'custom', label: 'Custom' }
  ];

  const unitOptions: CustomUnit[] = ['minutes', 'hours', 'days', 'weeks'];
  
  

  return (
    <div style={styles.page}>
      <section style={styles.card}>
        <div style={styles.subtitle}>
          E-mails quarentenados no período selecionado.
        </div>

        <div style={styles.quickTabsWrap}>
          {quickOptions.map((option, index) => (
            <button
              key={option.key}
              style={{
                ...(preset === option.key ? styles.tabActive : styles.tab),
                borderRight: index === quickOptions.length - 1 ? 'none' : '1px solid rgba(100,116,139,0.3)'
              }}
              onClick={() => setPreset(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>

        {preset === 'custom' && (
          <div style={styles.customBlock}>
            <div style={styles.customLabel}>Custom</div>

            <div style={styles.customGrid}>
              <input
                type="number"
                min={1}
                value={customValue}
                onChange={(e) => setCustomValue(Number(e.target.value) || 1)}
                style={styles.numberInput}
              />
              <div style={styles.unitTabsWrap}>
                {unitOptions.map((unit, index) => (
                  <button
                    key={unit}
                    style={{
                      ...(customUnit === unit ? styles.tabActive : styles.tab),
                      borderRight: index === unitOptions.length - 1 ? 'none' : '1px solid rgba(100,116,139,0.3)'
                    }}
                    onClick={() => setCustomUnit(unit)}
                  >
                    {unit}
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.applyCustomWrap}>
              <button style={styles.primaryButton} onClick={applyCustomFilter} disabled={loading}>
                {loading ? 'Aplicando...' : 'Aplicar'}
              </button>
            </div>
          </div>
        )}

        <input
          style={styles.searchInput}
          placeholder="Buscar por assunto, destinatário, remetente ou pasta de quarentena"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <div style={styles.toolbar}>
          <button
            style={styles.button}
            onClick={() =>
              void (fqidFromUrl
                ? loadItemByFqid(String(fqidFromUrl || ''))
                : loadItems())
            }
            disabled={loading}
          >
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>

          <button
            style={canApprove ? styles.primaryButton : styles.primaryButtonDisabled}
            onClick={() => void handleApproveClick()}
            disabled={!canApprove}
          >
            Aprovar selecionadas ({selectedItems.length})
          </button>
        </div>

        {message && (
          <div style={messageKind === 'error' ? styles.errorBox : styles.infoBox}>
            {message}
          </div>
        )}


          <div style={styles.list}>
            {filteredItems.length === 0 ? (
              <div style={styles.infoBox}>
                Nenhuma mensagem encontrada para o filtro informado.
              </div>
            ) : (
              filteredItems.map((item) => {
              const active = item.id === selectedId;
              return (
                <div
                  key={item.id}
                  style={active ? styles.rowActive : styles.row}
                  onClick={() => setSelectedId(item.id)}
                >
                  <div style={styles.rowHeader}>
                    <RoundCheckbox
                      checked={Boolean(checked[item.id])}
                      onChange={() => toggleCheck(item.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={styles.rowTitle}>Assunto: {item.subject || '-'}</div>
                      <div style={styles.rowMeta}>
                        <div><strong>De:</strong> {item.senderEmail || '-'}</div>
                        <div><strong>Para:</strong> {(item.recipients || []).join(', ') || '-'}</div>
                        <div><strong>Pasta de Quarentena:</strong> {item.folder || '-'}</div>
                        <div><strong>Status:</strong> {item.incidentStatus || '-'}</div>
                        <div><strong>Severidade:</strong> {formatSeverityLabel(item.incidentSeverity)}</div>
                        <div><strong>Enviado:</strong> {item.sentAt ? new Date(item.sentAt).toLocaleString('pt-BR') : '-'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
            )}
          </div> 
      </section>

      <section style={styles.card}>
        <div style={styles.titleCenter}>Detalhes do E-mail</div>

        {!selected ? (
          <div style={styles.subtitle}>Selecione uma mensagem para ver os detalhes.</div>
        ) : (

        <div style={{ ...styles.stack, minWidth: 0 }}>
          <div style={styles.miniCard}>
            <div style={styles.sectionDivider}>Informações da mensagem</div>

            <div style={{ display: 'grid', gap: 16, marginTop: 8 }}>
              <div style={styles.detailBlock}>
                <div style={styles.detailLabel}>Assunto</div>
                <div style={styles.detailValue}>{selected.subject || '-'}</div>
              </div>

              <div style={styles.detailBlock}>
                <div style={styles.detailLabel}>Pasta de Quarentena</div>
                <div style={styles.detailValue}>{selected.folder || '-'}</div>
              </div>
          
              <div style={styles.detailBlock}>
                <div style={styles.detailLabel}>Remetente</div>
                <div style={styles.detailValue}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span>{selected.senderDisplayName || '-'}</span>
                    {selected.senderIsVap ? (
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
                  <br />
                  <span style={{ fontWeight: 500 }}>{selected.senderEmail || '-'}</span>
                </div>
              </div>

              <div style={styles.detailBlock}>
                <div style={styles.detailLabel}>Destinatários</div>
                <div style={styles.detailValue}>
                  {(selected.recipients || []).join(', ') || '-'}
                </div>
              </div>

              <div style={styles.detailBlock}>
                <div style={styles.detailLabel}>Enviado em</div>
                <div style={styles.detailValue}>
                  {selected.sentAt ? new Date(selected.sentAt).toLocaleString('pt-BR') : '-'}
                </div>
              </div>
            </div>
          </div>

        <div style={styles.miniCard}>
            <div style={styles.sectionDivider}>Informações do incidente</div>

              <div style={{ display: 'grid', gap: 16, marginTop: 8 }}>
                <div style={styles.detailBlock}>
                  <div style={styles.detailLabel}>Tipo</div>
                  <div style={styles.detailValue}>{selected.incidentKind || '-'}</div>
                </div>

                <div style={styles.detailBlock}>
                  <div style={styles.detailLabel}>Status</div>
                  <div style={styles.detailValue}>{selected.incidentStatus || '-'}</div>
                </div>
            
                <div style={styles.detailBlock}>
                <div style={styles.detailLabel}>Severidade</div>
                  <div style={styles.detailValue}>
                    <span style={{ ...styles.kvValue, color: severityColor(selected.incidentSeverity) }}>
                        {formatSeverityLabel(selected.incidentSeverity)}
                        </span>
                  </div>
                </div>

                <div style={styles.detailBlock}>
                  <div style={styles.detailLabel}>Políticas aplicadas</div>
                        {selected.incidentReasons?.length ? (
                        <div style={{ display: 'inline-grid', gap: '10px', marginTop: '12px', minWidth: 0, maxWidth: '100%' }}>
                              {selected.incidentReasons.map((reason, idx) => (
                              <div
                                  key={`${reason.id || reason.name || 'reason'}-${idx}`}
                                  style={{
                                    background: 'linear-gradient(180deg, #04153fde 0%, #132042bb 100%)',
                                    border: '1px solid #60a5fa1f',
                                    borderRadius: '14px',
                                    padding: '12px',
                                    minWidth: 0,
                                    maxWidth: '100%',
                                    boxSizing: 'border-box'
                                  }}>
                                <div style={{ ...styles.kvLine, marginBottom: 10 }}>
                                    <span style={styles.kvKey}>Nome da política aplicada: </span>
                                    <span style={styles.kvValue}>{reason.name || reason.alias || '-'}</span>
                                </div>

                                {reason.description ? (
                                  <div style={styles.kvLine}>
                                    <span style={styles.kvKey}>Descrição da política: </span>
                                    <span style={styles.kvValue}>{reason.description}</span>
                                  </div>
                                  ) : null}

                                {reason.severity ? (
                                  <div style={styles.kvLine}>
                                    <span style={styles.kvKey}>Severidade da política: </span>
                                    <span style={{ ...styles.kvValue, color: severityColor(reason.severity) }}>{formatSeverityLabel(reason.severity)}</span>
                                  </div>
                                  ) : null}
                              </div>
                            ))}
                    </div>
                      ) : null}
              </div>
            </div>
          </div>

          <div style={styles.miniCard}>
            <div style={styles.sectionDivider}>Arquivos e conteúdo analisado</div>
            {selected.resources?.length ? (
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
                        alignContent: 'start',
                        minWidth: 0,
                        maxWidth: '100%',
                        boxSizing: 'border-box'
                      }}
                    >
                      <div style={{ ...styles.kvLine, marginBottom: 8 }}>
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
                                  <div style={{ ...styles.sectionDividerResources, marginBottom: 0, paddingTop: 0 }}>Indicadores</div>
                                  <div style={{ ...styles.stack, minWidth: 0, width: 'fit-content', maxWidth: '100%', gap: 14 }}>
                                    {renderMipRows(getMipBadges(resource))}
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

                {visibleStandaloneResources.map((resource: any, idx: number) => {
                  const standaloneDisplayName = String(
                    resource?.attachmentDisplayName || resource?.displayName || resource?.name || ''
                  ).trim();
                  const showStandaloneFileHeader =
                    String(resource?.resourceDisplayCategory || '') === 'derived_analysis_file' &&
                    standaloneDisplayName &&
                    !isGenericEmailLabel(standaloneDisplayName);

                  return (
                    <div
                      key={`standalone-${resource.id || resource.name || idx}`}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(71, 85, 105, 0.35)',
                        borderRadius: 12,
                        padding: 10,
                        display: 'grid',
                        gap: 6,
                        alignContent: 'start',
                        minWidth: 0,
                        maxWidth: '100%',
                        boxSizing: 'border-box'
                      }}
                    >
                      {showStandaloneFileHeader ? (
                        <div style={{ ...styles.kvLine, marginBottom: 6 }}>
                          <span style={styles.kvKey}>Arquivo analisado: </span>
                          <span
                            style={{
                              ...styles.kvValue,
                              color: '#f87171',
                              fontWeight: 800
                            }}
                          >
                            {standaloneDisplayName}
                          </span>
                        </div>
                      ) : null}

                      <div
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
                          overflowX: 'hidden',
                          marginTop: showStandaloneFileHeader ? 0 : 4
                        }}
                      >
                        {(getMipBadges(resource).length || getNonMipIndicators(resource).length) ? (
                          <div style={{ display: 'grid', gap: 10, minWidth: 0 }}>
                            <div style={{ ...styles.sectionDividerResources, marginBottom: 0, paddingTop: 0 }}>Indicadores</div>
                            <div style={{ ...styles.stack, minWidth: 0, width: 'fit-content', maxWidth: '100%', gap: 14 }}>
                              {renderMipRows(getMipBadges(resource))}
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
                  );
                })}
              </div>
            ) : (
              <div style={styles.detailValue}>Sem arquivos ou conteúdos relevantes.</div>
            )}
          </div>

         
        </div>
      )}  
      </section>

      <style jsx>{`
        @media (max-width: 1100px) {
          div[style*="grid-template-columns: minmax(360px, 400px) minmax(0, 1fr)"] {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 520px) {
          div[style*="grid-template-columns: repeat(5, minmax(0, 1fr))"] button,
          div[style*="grid-template-columns: repeat(4, minmax(0, 1fr))"] button {
            font-size: 12px !important;
            padding: 10px 4px !important;
          }
        }

        @media (max-width: 700px) {
          span[style*="border-radius: 999px"] {
            display: inline-flex !important;
            max-width: 100% !important;
            white-space: normal !important;
            word-break: break-word !important;
            overflow-wrap: anywhere !important;
            box-sizing: border-box !important;
            font-size: 11px !important;
            line-height: 1.3 !important;
            padding: 6px 10px !important;
          }

          div[style*="display: grid"][style*="width: 100%"] {
            min-width: 0 !important;
            max-width: 100% !important;
          }

          div[style*="grid-template-columns: max-content auto"] {
            grid-template-columns: 1fr !important;
            gap: 8px !important;
          }
      `}</style>
    </div>
  );
}

export default function QuarantinePage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: '#94a3b8' }}>Carregando fila...</div>}>
      <QuarantinePageContent />
    </Suspense>
  );
}
