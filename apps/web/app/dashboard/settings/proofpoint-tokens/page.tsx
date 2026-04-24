'use client';

import { useEffect, useMemo, useState } from 'react';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { sharedStyles, mergeStyles } from '../../../../lib/ui-styles';


type ConfigResponse = {
  configured?: boolean;
  healthy?: boolean;
  status?: 'healthy' | 'error' | 'not_configured';
  clientId?: string | null;
  webhookSecret?: string | null;
  hasClientId?: boolean;
  hasClientSecret?: boolean;
  hasWebhookSecret?: boolean;
  tokenExpiresAt?: string | null;
  statusMessage?: string;
};

  const styles = mergeStyles(sharedStyles, {
    page: {
      display: 'grid',
      gridTemplateColumns: '1.2fr 0.8fr',
      gap: '24px',
      width: '100%',
      minWidth: 0
    },

    secretFieldWrap: {
      position: 'relative',
      width: '100%',
      marginBottom: '14px'
    },
  

    input: {
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box',
      padding: '11px 48px 11px 14px',
      borderRadius: '12px',
      border: '1px solid rgba(100,116,139,0.35)',
      background: '#0b1737',
      color: '#e2e8f0',
      fontSize: '14px',
      outline: 'none',
      marginBottom: '14px'
    },


    inputDisabled: {
      width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        padding: '11px 48px 11px 14px',
        borderRadius: '12px',
        border: '1px solid rgba(100,116,139,0.35)',
        background: '#0b1737',
        color: '#e2e8f0',
        fontSize: '14px',
        outline: 'none',
        marginBottom: '14px'
    }
  });
  
type PendingAction = 'save' | 'delete' | null;

export default function ProofpointConfigPage() {
  const [storedClientId, setStoredClientId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [webhookSecret, setWebhookSecret] = useState('');
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<string | null>(null);
  const [hasClientSecret, setHasClientSecret] = useState(false);
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState<'info' | 'success' | 'error'>('info');
  const [loading, setLoading] = useState(false);
  const [editingCredentials, setEditingCredentials] = useState(false);
  const [configStatus, setConfigStatus] = useState<'healthy' | 'error' | 'not_configured'>('not_configured');
  const [statusMessage, setStatusMessage] = useState('Nenhuma configuracao cadastrada.');
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  async function loadConfig() {
    try {
      const res = await fetch('/api/admin/integrations/proofpoint-config', { credentials: 'include' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 403) {
          throw new Error('Acesso restrito a administradores.');
        }
        throw new Error(`${res.status} - ${data.message || 'Erro ao carregar configuracao'}`);
      }
      const data: ConfigResponse = await res.json();

      setStoredClientId(data.clientId || '');
      setTokenExpiresAt(data.tokenExpiresAt || null);
      setHasClientSecret(Boolean(data.hasClientSecret));
      setWebhookSecret(data.webhookSecret || '');
      setShowWebhookSecret(false);
      setConfigStatus(data.status || 'not_configured');
      setStatusMessage(data.statusMessage || 'Sem informacao de status.');
      setClientId(data.clientId || '');
      setClientSecret('');
      setShowSecret(false);
      setEditingCredentials(false);
    } catch (error: any) {
      setConfigStatus('error');
      setStatusMessage(error.message || 'Erro ao carregar configuracao.');
      setMessage(error.message || 'Erro ao carregar configuracao.');
      setMessageKind('error');
    }
  }

  useEffect(() => {
    loadConfig();
  }, []);

  const credentialsChanged = editingCredentials && (
    clientId.trim() !== (storedClientId || '') || !!clientSecret.trim()
  );

  const canSave = useMemo(() => {
    if (loading) return false;
    if (!credentialsChanged) return false;
    return Boolean(clientId.trim() && (clientSecret.trim() || storedClientId));
  }, [loading, credentialsChanged, clientId, clientSecret, storedClientId]);

  async function doSaveConfig() {
    if (!canSave) return;
    setLoading(true);
    setMessage('');
    setMessageKind('info');
    try {
      const body: any = { clientId: clientId.trim() };
      if (clientSecret.trim()) body.clientSecret = clientSecret.trim();

      const res = await fetch('/api/admin/integrations/proofpoint-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 403) throw new Error('Acesso restrito a administradores.');
        throw new Error(`${res.status} - ${data.message || 'Erro ao salvar configuracao'}`);
      }

      setMessage('Credenciais salvas com sucesso.');
      setMessageKind('success');
      await loadConfig();
    } catch (error: any) {
      setMessage(error.message || 'Erro ao salvar configuracao.');
      setMessageKind('error');
    } finally {
      setLoading(false);
      setPendingAction(null);
    }
  }

  async function testToken() {
    setLoading(true);
    setMessage('');
    setMessageKind('info');
    try {
      const res = await fetch('/api/admin/integrations/proofpoint-config/test-token', {
        method: 'POST',
        credentials: 'include'
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 403) throw new Error('Acesso restrito a administradores.');
        throw new Error(`${res.status} - ${data.message || 'Erro ao testar token'}`);
      }

      setMessage(`Token gerado com sucesso: ${data.tokenPreview || ''}`);
      setMessageKind('success');
      await loadConfig();
    } catch (error: any) {
      setMessage(error.message || 'Erro ao testar token.');
      setMessageKind('error');
      await loadConfig();
    } finally {
      setLoading(false);
    }
  }

  async function refreshToken() {
    setLoading(true);
    setMessage('');
    setMessageKind('info');
    try {
      const res = await fetch('/api/admin/integrations/proofpoint-config/refresh-token', {
        method: 'POST',
        credentials: 'include'
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 403) throw new Error('Acesso restrito a administradores.');
        throw new Error(`${res.status} - ${data.message || 'Erro ao renovar token'}`);
      }

      setMessage(`Token renovado com sucesso: ${data.tokenPreview || ''}`);
      setMessageKind('success');
      await loadConfig();
    } catch (error: any) {
      setMessage(error.message || 'Erro ao renovar token.');
      setMessageKind('error');
      await loadConfig();
    } finally {
      setLoading(false);
    }
  }

  async function resetWebhookSecret() {
    setLoading(true);
    setMessage('');
    setMessageKind('info');
    try {
      const res = await fetch('/api/admin/integrations/proofpoint-config/reset-webhook', {
        method: 'POST',
        credentials: 'include'
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 403) throw new Error('Acesso restrito a administradores.');
        throw new Error(`${res.status} - ${data.message || 'Erro ao resetar webhook secret'}`);
      }

      setWebhookSecret(data.webhookSharedSecret || '');
      setShowWebhookSecret(false);
      setMessage('Webhook secret resetado com sucesso.');
      setMessageKind('success');
      await loadConfig();
    } catch (error: any) {
      setMessage(error.message || 'Erro ao resetar webhook secret.');
      setMessageKind('error');
    } finally {
      setLoading(false);
    }
  }

  async function doDeleteConfig() {
    setLoading(true);
    setMessage('');
    setMessageKind('info');
    try {
      const res = await fetch('/api/admin/integrations/proofpoint-config', {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 403) throw new Error('Acesso restrito a administradores.');
        throw new Error(`${res.status} - ${data.message || 'Erro ao deletar configuracao'}`);
      }

      setStoredClientId('');
      setClientId('');
      setClientSecret('');
      setTokenExpiresAt(null);
      setHasClientSecret(false);
      setConfigStatus('not_configured');
      setStatusMessage('Nenhuma configuracao cadastrada.');
      setMessage('Configuracao removida com sucesso.');
      setMessageKind('success');
    } catch (error: any) {
      setMessage(error.message || 'Erro ao deletar configuracao.');
      setMessageKind('error');
    } finally {
      setLoading(false);
      setPendingAction(null);
    }
  }

  async function saveCredentials() {
    await doSaveConfig();
  }

  const statusVisual = configStatus === 'healthy'
    ? { icon: '✅', text: 'Configurada e válida', color: '#bbf7d0' }
    : configStatus === 'error'
      ? { icon: '⚠️', text: 'Configurada com erro', color: '#fecdd3' }
      : { icon: '⏺', text: 'Não configurada', color: '#cbd5e1' };

  return (
    <>
      <div style={styles.page}>
        <section style={styles.card}>
          <div style={styles.title}>Credenciais da Proofpoint</div>
          <div style={styles.subtitle}>
            O portal usa client_id e client_secret para gerar access token e refresh token automaticamente no backend.
          </div>

          <div style={styles.innerCard}>
            <div style={styles.innerTitle}>Credenciais da integração</div>
            <div style={styles.innerSubtitle}>
              Configure o client_id e o client_secret utilizados para gerar os tokens da Proofpoint.
            </div>

            <label style={styles.label}>Client ID</label>
            <input
              style={{
                ...(editingCredentials ? styles.input : styles.inputDisabled),
                paddingRight: '48px',
                marginBottom: 0
              }}
              value={editingCredentials ? clientId : storedClientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Client ID da Proofpoint"
              disabled={!editingCredentials}
            />

            <label style={{ ...styles.label, marginTop: '16px' }}>
              Client Secret
            </label>

            <div style={styles.secretFieldWrap}>
              <input
                type={showSecret ? 'text' : 'password'}
                style={{
                  ...(editingCredentials ? styles.input : styles.inputDisabled),
                  paddingRight: '48px',
                  marginBottom: 0
                }}
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder={editingCredentials ? 'Digite o client secret' : 'Secret protegido'}
                disabled={!editingCredentials}
              />
              <button
                type="button"
                aria-label={showSecret ? 'Ocultar secret' : 'Mostrar secret'}
                title={showSecret ? 'Ocultar secret' : 'Mostrar secret'}
                style={styles.eyeBtn}
                onClick={() => setShowSecret((prev) => !prev)}
              >
                {showSecret ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3l18 18"/>
                    <path d="M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58"/>
                    <path d="M9.88 5.09A10.94 10.94 0 0112 5c5.05 0 9.27 3.11 10 7-0.24 1.27-0.92 2.48-1.96 3.5"/>
                    <path d="M6.61 6.61C4.62 7.9 3.29 9.82 2 12c0 0 3 7 10 7 2.05 0 3.85-.6 5.39-1.61"/>
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>

            <div style={styles.toolbar}>
              {!editingCredentials ? (
                <>
                  <button
                    style={styles.primaryBtn}
                    onClick={() => {
                      setEditingCredentials(true);
                      setShowSecret(false);
                    }}
                    disabled={loading}
                  >
                    Editar configuração
                  </button>

                  <button
                    style={styles.dangerBtn}
                    onClick={() => setPendingAction('delete')}
                    disabled={loading}
                  >
                    {loading ? 'Deletando...' : 'Deletar configuração'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    style={styles.primaryBtn}
                    onClick={saveCredentials}
                    disabled={loading}
                  >
                    {loading ? 'Salvando...' : 'Salvar configuração'}
                  </button>

                  <button
                    style={styles.secondaryBtn}
                    onClick={() => {
                      setEditingCredentials(false);
                      setShowSecret(false);
                      setClientId(storedClientId || '');
                      setClientSecret('');
                    }}
                    disabled={loading}
                  >
                    Cancelar
                  </button>

                  <button
                    style={styles.dangerBtn}
                    onClick={() => setPendingAction('delete')}
                    disabled={loading}
                  >
                    {loading ? 'Deletando...' : 'Deletar configuração'}
                  </button>
                </>
              )}
            </div>
          </div>

          <div style={styles.innerCard}>
            <div style={styles.innerTitle}>Webhook secret</div>
            <div style={styles.innerSubtitle}>
              Segredo compartilhado utilizado pelos webhooks. Mantenha este valor protegido.
            </div>

            <label style={styles.label}>Webhook Shared Secret</label>
          <div style={styles.secretFieldWrap}>
              <input
                type={showWebhookSecret ? 'text' : 'password'}
                style={{
                  ...styles.inputDisabled,
                  paddingRight: '48px',
                  marginBottom: 0
                }}
                value={webhookSecret || ''}
                placeholder="Webhook secret protegido"
                disabled
              />

              <button
                type="button"
                aria-label={showWebhookSecret ? 'Ocultar webhook secret' : 'Mostrar webhook secret'}
                title={showWebhookSecret ? 'Ocultar webhook secret' : 'Mostrar webhook secret'}
                style={styles.eyeBtn}
                onClick={() => setShowWebhookSecret((prev) => !prev)}
              >
                {showWebhookSecret ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3l18 18"/>
                    <path d="M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58"/>
                    <path d="M9.88 5.09A10.94 10.94 0 0112 5c5.05 0 9.27 3.11 10 7-0.24 1.27-0.92 2.48-1.96 3.5"/>
                    <path d="M6.61 6.61C4.62 7.9 3.29 9.82 2 12c0 0 3 7 10 7 2.05 0 3.85-.6 5.39-1.61"/>
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>

            <div style={styles.toolbar}>
              <button
                style={styles.secondaryBtn}
                onClick={resetWebhookSecret}
                disabled={loading || !hasClientSecret}
              >
                {loading ? 'Resetando...' : 'Reset webhook secret'}
              </button>
            </div>
          </div>

          {message && (
            <div style={messageKind === 'error' ? styles.errorBox : messageKind === 'success' ? styles.successBox : styles.infoBox}>
              {message}
            </div>
          )}
        </section>

        <section style={styles.card}>
          <div style={{ ...styles.title,}}>Resumo da integração</div>

          <div style={styles.statBox}>
            <div style={styles.statLabel}>Status</div>
            <div style={{ ...styles.innerTitle, color: statusVisual.color }}>
              {statusVisual.icon} {statusVisual.text}
            </div>
          </div>

          <div style={styles.statBox}>
            <div style={styles.statLabel}>Diagnóstico</div>
            <div style={{ ...styles.innerTitle, fontSize: '18px', lineHeight: 1.5 }}>
              {statusMessage}
            </div>
          </div>

          <div style={styles.statBox}>
            <div style={styles.statLabel}>Client ID atual</div>
            <div style={styles.innerTitle}>{storedClientId || 'Não configurado'}</div>
          </div>

          <div style={styles.statBox}>
            <div style={styles.statLabel}>Refresh token</div>
            <div style={styles.innerTitle}>
              {hasClientSecret ? 'Gerenciado automaticamente pelo backend' : 'Sem configuração'}
            </div>
          </div>

          {configStatus === 'error' && (
            <div style={styles.errorBox}>
              A configuração existe, mas o token está com problema. Revise client_id, client_secret e tente testar o token.
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={pendingAction === 'save'}
        title="Salvar credenciais?"
        message="Confirma que deseja atualizar as credenciais da Proofpoint?"
        confirmText="Sim, salvar"
        cancelText="Não, voltar"
        onConfirm={doSaveConfig}
        onCancel={() => setPendingAction(null)}
        loading={loading}
      />

      <ConfirmDialog
        open={pendingAction === 'delete'}
        title="Deletar configuração?"
        message="Esta ação removerá a configuração atual da Proofpoint. Deseja continuar?"
        confirmText="Sim, deletar"
        cancelText="Não, voltar"
        onConfirm={doDeleteConfig}
        onCancel={() => setPendingAction(null)}
        loading={loading}
      />
    </>
  );
}
