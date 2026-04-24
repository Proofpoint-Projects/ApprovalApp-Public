'use client';

import { sharedStyles, mergeStyles } from '../../../lib/ui-styles';
import { useEffect, useMemo, useState } from 'react';
type AuditLog = {
  id: string;
  createdAt: string;
  actorEmail?: string | null;
  action?: string;
  entityType?: string;
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadataJson?: any;
};

type AuditPeriod = '24h' | '7d' | '30d' | 'all';
type AuditType = 'all' | 'auth' | 'token' | 'approval' | 'quarantine' | 'config';

const styles = mergeStyles(sharedStyles, {
  page: {
    ...sharedStyles.pageSidebarDetail,
    display: 'block',
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    overflowX: 'hidden'
  },
  card: {
    ...sharedStyles.card,
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    overflow: 'hidden',
    borderRadius: '24px',
    padding: '28px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.25)'
  },
  pre: {
    margin: 0,
    padding: '10px 12px',
    borderRadius: 10,
    background: 'rgba(2, 6, 23, 0.6)',
    border: '1px solid rgba(96, 165, 250, 0.12)',
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 1.45,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
    maxWidth: '100%'
  }
});

function formatAction(action?: string) {
  const raw = String(action || '').trim();
  if (!raw) return '-';

  const map: Record<string, string> = {
    LOGIN: 'Login',
    LOGOUT: 'Logout',
    APPROVE: 'Aprovação',
    DENY: 'Negação',
    BULK_APPROVE: 'Aprovação em lote',
    TOKEN_CREATE: 'Salvar configuração',
    TOKEN_ROTATE: 'Teste / refresh de token',
    TOKEN_DELETE: 'Remoção de configuração',
    PREVIEW: 'Pré-visualização',
    PROOFPOINT_EMAIL_APPROVE: 'Aprovação de quarentena',
    PROOFPOINT_EMAIL_APPROVE_FAILED: 'Falha na aprovação de quarentena'
  };

  return map[raw] || raw;
}

function formatEntityType(entityType?: string) {
  const raw = String(entityType || '').trim();
  if (!raw) return '-';

  const map: Record<string, string> = {
    ProofpointConfig: 'Configuração Proofpoint',
    WebhookSecret: 'Webhook secret',
    AuthSession: 'Sessão',
    ApprovalItem: 'Solicitação de aprovação',
    approval_item: 'Solicitação de aprovação',
    EmailQuarantine: 'Quarentena de e-mail',
    proofpoint_email_event: 'Evento de quarentena'
  };

  return map[raw] || raw;
}

function getResult(log: AuditLog) {
  const action = String(log.action || '').toUpperCase();
  const metadata = log.metadataJson || {};

  if (action.includes('FAILED') || metadata?.success === false || metadata?.ok === false) {
    return 'Falha';
  }

  return 'Sucesso';
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [userFilter, setUserFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState<AuditPeriod>('7d');
  const [typeFilter, setTypeFilter] = useState<AuditType>('all');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const params = new URLSearchParams();
      if (userFilter.trim()) params.set('user', userFilter.trim());
      if (periodFilter) params.set('period', periodFilter);
      if (typeFilter) params.set('type', typeFilter);

      const query = params.toString() ? `?${params.toString()}` : '';

      const res = await fetch(`/api/admin/audit${query}`, { credentials: 'include' });
      const data = await res.json().catch(() => []);

      if (res.status === 403) {
        throw new Error('Acesso restrito a administradores.');
      }

      if (!res.ok) {
        throw new Error(data?.message || 'Erro ao carregar trilha de auditoria.');
      }

      setLogs(Array.isArray(data) ? data : []);
      setMessage(`Eventos carregados: ${Array.isArray(data) ? data.length : 0}.`);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar auditoria.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const totalSuccess = useMemo(
    () => logs.filter((log) => getResult(log) === 'Sucesso').length,
    [logs]
  );

  const totalFailure = useMemo(
    () => logs.filter((log) => getResult(log) === 'Falha').length,
    [logs]
  );

  const [selectedMetadata, setSelectedMetadata] = useState<any | null>(null);
  const [metadataTitle, setMetadataTitle] = useState('');

  return (
    <>
      <div style={styles.page}>
        <section style={styles.card}>
          
          <div style={styles.subtitle}>
            Histórico completo das ações realizadas no portal: logins, alterações de configuração, operações de token, aprovações e eventos de segurança.
          </div>

          <div style={styles.toolbar}>
            <input
              style={styles.searchInput}
              placeholder="Filtrar por usuário, ação ou entidade"
              value={userFilter}
              onChange={(event) => setUserFilter(event.target.value)}
            />

            <select
              style={styles.select}
              value={periodFilter}
              onChange={(event) => setPeriodFilter(event.target.value as AuditPeriod)}
            >
              <option value="24h">Últimas 24 horas</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="all">Todo o período</option>
            </select>

            <select
              style={styles.select}
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as AuditType)}
            >
              <option value="all">Todos os tipos</option>
              <option value="auth">Login / Logout</option>
              <option value="token">Tokens</option>
              <option value="approval">Approvals</option>
              <option value="quarantine">Quarentena</option>
              <option value="config">Configuração</option>
            </select>

            <button   style={{...styles.button, minWidth: 180}} onClick={() => void load()} disabled={loading}>
              {loading ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>

          <div style={styles.helper}>
            Sucessos: {totalSuccess} • Falhas: {totalFailure} • Total exibido: {logs.length}
          </div>

          {error && <div style={styles.errorBox}>{error}</div>}
          

            <div
              style={{
                ...styles.tableWrap,
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box'
              }}
            >
            <table
              style={{
                ...styles.table,
                width: '100%',
                maxWidth: '100%'
              }}
            >
              <thead>
                <tr>
                  <th style={styles.th}>Data</th>
                  <th style={styles.th}>Ator</th>
                  <th style={styles.th}>Ação</th>
                  <th style={styles.th}>Entidade</th>
                  <th style={styles.th}>Resultado</th>
                  <th style={styles.th}>IP</th>
                  <th style={{ ...styles.th, width: '10%' }}>Metadata</th>
                </tr>
              </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ ...styles.td, textAlign: 'center' }}>
                        {loading ? 'Carregando...' : 'Nenhum registro encontrado.'}
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id}>
                        <td
                          style={{
                            ...styles.td,
                            whiteSpace: 'nowrap',
                            verticalAlign: 'top'
                          }}
                        >
                          {log.createdAt ? new Date(log.createdAt).toLocaleString('pt-BR') : '-'}
                        </td>

                        <td
                          style={{
                            ...styles.td,
                            verticalAlign: 'top',
                            minWidth: 220
                          }}
                        >
                          <div style={{ fontWeight: 600, wordBreak: 'break-word' }}>
                            {log.actorEmail || '-'}
                          </div>

                          {log.userAgent ? (
                            <div
                              style={{
                                ...styles.helper,
                                marginTop: 6,
                                whiteSpace: 'normal',
                                wordBreak: 'break-word',
                                overflowWrap: 'anywhere',
                                maxWidth: 320
                              }}
                            >
                              {String(log.userAgent)}
                            </div>
                          ) : null}
                        </td>

                        <td
                          style={{
                            ...styles.td,
                            whiteSpace: 'nowrap',
                            verticalAlign: 'top'
                          }}
                        >
                          <span style={styles.chip}>{formatAction(log.action)}</span>
                        </td>

                        <td
                          style={{
                            ...styles.td,
                            verticalAlign: 'top',
                            minWidth: 240
                          }}
                        >
                          <div style={{ fontWeight: 600, wordBreak: 'break-word' }}>
                            {formatEntityType(log.entityType)}
                          </div>

                          {log.entityId ? (
                            <div
                              style={{
                                ...styles.helper,
                                marginTop: 6,
                                whiteSpace: 'normal',
                                wordBreak: 'break-word',
                                overflowWrap: 'anywhere',
                                maxWidth: 360
                              }}
                            >
                              {log.entityId}
                            </div>
                          ) : null}
                        </td>

                        <td
                          style={{
                            ...styles.td,
                            whiteSpace: 'nowrap',
                            verticalAlign: 'top'
                          }}
                        >
                          {getResult(log)}
                        </td>

                        <td
                          style={{
                            ...styles.td,
                            whiteSpace: 'nowrap',
                            verticalAlign: 'top'
                          }}
                        >
                          {log.ipAddress || '-'}
                        </td>

                      <td
                          style={{
                            ...styles.td,
                            whiteSpace: 'nowrap',
                            verticalAlign: 'top'
                          }}
                        >
                          <button
                            type="button"
                            style={{ ...styles.buttonTable, minWidth: 90 }}
                            onClick={() => {
                              setSelectedMetadata(log.metadataJson || {});
                              setMetadataTitle(
                                `${formatAction(log.action)} • ${log.actorEmail || 'Sem ator'}`
                              );
                            }}
                          >
                            Ver metadata
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
            </table>
          </div>
        </section>
      </div>
      {selectedMetadata !== null ? (
        <div
          style={styles.overlay}
          onClick={() => {
            setSelectedMetadata(null);
            setMetadataTitle('');
          }}
        >
          <div
            style={{
              ...styles.modal,
              maxWidth: 820,
              width: 'min(820px, calc(100vw - 32px))',
              maxHeight: '80vh',
              display: 'grid',
              gap: 14
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div>
              <div style={styles.innerTitle}>Metadata do evento</div>
              <div style={styles.innerSubtitle}>{metadataTitle}</div>
            </div>

            <div
              style={{
                maxHeight: '58vh',
                overflow: 'auto',
                borderRadius: 12
              }}
            >
              <pre
                style={{
                  ...styles.pre,
                  margin: 0,
                  minHeight: 120
                }}
              >
                {JSON.stringify(selectedMetadata, null, 2)}
              </pre>
            </div>

            <div style={styles.modalActions}>
              <button
                type="button"
                style={styles.secondaryBtn}
                onClick={() => {
                  setSelectedMetadata(null);
                  setMetadataTitle('');
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
