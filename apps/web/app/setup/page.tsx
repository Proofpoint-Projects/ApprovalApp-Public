'use client';

import { useEffect, useState } from 'react';

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(180deg, #020617 0%, #020617 100%)',
    padding: '24px'
  } as React.CSSProperties,
  card: {
    width: '100%',
    maxWidth: '560px',
    padding: '36px',
    borderRadius: '20px',
    background: 'rgba(15, 23, 42, 0.9)',
    border: '1px solid rgba(71,85,105,0.3)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
  } as React.CSSProperties,
  logoWrap: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '18px'
  } as React.CSSProperties,
  logo: {
    height: '48px',
    marginBottom: '18px'
  } as React.CSSProperties,
  title: {
    color: '#e2e8f0',
    fontSize: '28px',
    fontWeight: 800,
    marginBottom: '10px'
  } as React.CSSProperties,
  subtitle: {
    color: '#94a3b8',
    fontSize: '14px',
    marginBottom: '24px',
    lineHeight: 1.6
  } as React.CSSProperties,
  label: {
    display: 'block',
    color: '#cbd5e1',
    fontWeight: 700,
    marginBottom: '8px',
    marginTop: '14px'
  } as React.CSSProperties,
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
  } as React.CSSProperties,
  secretFieldWrap: {
    position: 'relative',
    width: '100%',
    marginBottom: '14px'
  } as React.CSSProperties,
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '32px',
    height: '32px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    zIndex: 2
  } as React.CSSProperties,
  button: {
    width: '100%',
    marginTop: '22px',
    padding: '14px',
    borderRadius: '12px',
    border: 'none',
    background: '#2563eb',
    color: '#fff',
    fontWeight: 700,
    fontSize: '15px',
    cursor: 'pointer'
  } as React.CSSProperties,
  secondaryButton: {
    width: '100%',
    marginTop: '12px',
    padding: '14px',
    borderRadius: '12px',
    border: '1px solid rgba(100,116,139,0.45)',
    background: 'transparent',
    color: '#e2e8f0',
    fontWeight: 700,
    fontSize: '15px',
    cursor: 'pointer'
  } as React.CSSProperties,
  infoBox: {
    marginTop: '16px',
    padding: '14px 16px',
    borderRadius: '14px',
    border: '1px solid rgba(71,85,105,0.35)',
    background: 'rgba(15,23,42,0.72)',
    color: '#e2e8f0'
  } as React.CSSProperties,
  successBox: {
    marginTop: '16px',
    padding: '14px 16px',
    borderRadius: '14px',
    border: '1px solid rgba(16,185,129,0.45)',
    background: 'rgba(6,78,59,0.2)',
    color: '#bbf7d0',
    whiteSpace: 'pre-wrap'
  } as React.CSSProperties,
  errorBox: {
    marginTop: '16px',
    padding: '14px 16px',
    borderRadius: '14px',
    border: '1px solid rgba(244,63,94,0.45)',
    background: 'rgba(127,29,29,0.18)',
    color: '#fecdd3'
  } as React.CSSProperties
};

export default function SetupPage() {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    async function validateAccess() {
      try {
        const meRes = await fetch('/api/auth/me', { credentials: 'include' });

        if (meRes.status === 401) {
          window.location.href = '/login';
          return;
        }

        if (!meRes.ok) {
          window.location.href = '/login';
          return;
        }

        const me = await meRes.json();

        const setupRes = await fetch('/api/setup/status', { credentials: 'include' });

        if (setupRes.status === 401) {
          window.location.href = '/login';
          return;
        }

        if (!setupRes.ok) {
          window.location.href = '/login';
          return;
        }

        const data = await setupRes.json();

        // setup já concluído: ninguém fica aqui
        if (!data?.requiresSetup) {
          window.location.href = '/dashboard/quarantine';
          return;
        }

        // setup pendente, mas usuário não é admin
        if (me?.role !== 'ADMIN') {
          window.location.href = '/setup/pending';
          return;
        }

        // setup pendente + admin
        setBootLoading(false);
      } catch {
        window.location.href = '/login';
      }
    }

    void validateAccess();
  }, []);

  useEffect(() => {
    if (!initialized) return;

    if (countdown <= 0) {
      window.location.href = '/login';
      return;
    }

    const timer = window.setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [initialized, countdown]);

  async function onSubmit() {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const res = await fetch('/api/setup/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ clientId, clientSecret })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || 'Erro ao concluir configuração inicial.');
      }

      setInitialized(true);
      setCountdown(15);
      setMessage(
        `Configuração inicial concluída.\n\nWebhook Shared Secret:\n${data.webhookSharedSecret}\n\nCopie e guarde este valor em local seguro.\n\nVocê será redirecionado em 15 segundos.`
      );
    } catch (e: any) {
      setError(e.message || 'Erro ao concluir configuração inicial.');
    } finally {
      setLoading(false);
    }
  }

  if (bootLoading) {
    return null;
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoWrap}>
          <img src="/proofpoint-logo.png" alt="Proofpoint" style={styles.logo} />
        </div>

        <div style={styles.title}>Configuração inicial</div>
        <div style={styles.subtitle}>
          Faça a primeira configuração da aplicação antes de liberar o acesso completo dos usuários.
        </div>

        <label style={styles.label}>Proofpoint Client ID</label>
        <input
          style={styles.input}
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        />

        <label style={styles.label}>Proofpoint Client Secret</label>
        <div style={styles.secretFieldWrap}>
          <input
            type={showSecret ? 'text' : 'password'}
            style={styles.input}
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
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

        {!initialized ? (
          <button
            style={styles.button}
            onClick={onSubmit}
            disabled={loading || !clientId || !clientSecret}
          >
            {loading ? 'Salvando...' : 'Concluir configuração inicial'}
          </button>
        ) : (
          <button style={styles.button} onClick={() => (window.location.href = '/login')}>
            Prosseguir para login
          </button>
        )}

        {initialized ? (
          <button
            style={styles.secondaryButton}
            onClick={() => (window.location.href = '/login')}
          >
            Você será redirecionado em {countdown} segundos
          </button>
        ) : null}

        {error ? <div style={styles.errorBox}>{error}</div> : null}
        {message ? (
          <div style={initialized ? styles.successBox : styles.infoBox}>{message}</div>
        ) : null}
      </div>
    </div>
  );
}