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
    maxWidth: '580px',
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
    marginBottom: '10px',
    textAlign: 'center'
  } as React.CSSProperties,
  subtitle: {
    color: '#94a3b8',
    fontSize: '15px',
    marginBottom: '24px',
    lineHeight: 1.7,
    textAlign: 'center'
  } as React.CSSProperties,
  infoBox: {
    marginTop: '16px',
    padding: '14px 16px',
    borderRadius: '14px',
    border: '1px solid rgba(71,85,105,0.35)',
    background: 'rgba(15,23,42,0.72)',
    color: '#e2e8f0',
    lineHeight: 1.6
  } as React.CSSProperties,
  buttonRow: {
    display: 'grid',
    gap: '12px',
    marginTop: '24px'
  } as React.CSSProperties,
  primaryButton: {
    width: '100%',
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
    padding: '14px',
    borderRadius: '12px',
    border: '1px solid rgba(100,116,139,0.45)',
    background: 'transparent',
    color: '#e2e8f0',
    fontWeight: 700,
    fontSize: '15px',
    cursor: 'pointer'
  } as React.CSSProperties
};

export default function SetupPendingPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function validate() {
      try {
        const meRes = await fetch('/api/auth/me', {
          credentials: 'include'
        });

        if (meRes.status === 401) {
          window.location.href = '/login';
          return;
        }

        if (!meRes.ok) {
          window.location.href = '/login';
          return;
        }

        const me = await meRes.json();

        const setupRes = await fetch('/api/setup/status', {
          credentials: 'include'
        });

        if (setupRes.status === 401) {
          window.location.href = '/login';
          return;
        }

        if (!setupRes.ok) {
          window.location.href = '/login';
          return;
        }

        const setup = await setupRes.json();

        if (!setup?.requiresSetup) {
          window.location.href = '/dashboard/quarantine';
          return;
        }

        setIsAdmin(me?.role === 'ADMIN');
        setLoading(false);
      } catch {
        window.location.href = '/login';
      }
    }

    void validate();
  }, []);

  if (loading) return null;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoWrap}>
          <img src="/proofpoint-logo.png" alt="Proofpoint" style={styles.logo} />
        </div>

        <div style={styles.title}>Configuração inicial pendente</div>

        <div style={styles.subtitle}>
          A aplicação ainda não foi configurada completamente.  
          Enquanto isso não for concluído, o acesso ao portal permanece bloqueado.
        </div>

        <div style={styles.infoBox}>
          {isAdmin
            ? 'Você possui permissão de administrador e pode concluir a configuração inicial agora.'
            : 'Somente um administrador pode concluir a configuração inicial. Entre em contato com um usuário administrador para liberar o acesso ao portal.'}
        </div>

        <div style={styles.buttonRow}>
          {isAdmin ? (
            <button
              style={styles.primaryButton}
              onClick={() => {
                window.location.href = '/setup';
              }}
            >
              Ir para setup
            </button>
          ) : null}

          <button
            style={styles.secondaryButton}
            onClick={() => {
              window.location.href = '/login';
            }}
          >
            Voltar para login
          </button>
        </div>
      </div>
    </div>
  );
}