'use client';

export default function LoginPage() {
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <img src="/proofpoint-logo.png" alt="Proofpoint" style={styles.logo} />

        <h1 style={styles.title}>Portal de Aprovações do Gestor</h1>

        <p style={styles.subtitle}>
          Acesse com sua conta corporativa para gerenciar eventos de segurança e quarentena.
        </p>

        <button
          style={styles.button}
          onClick={() => (window.location.href = '/api/auth/saml/login')}
        >
          Entrar com Microsoft 365
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: {
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(180deg, #020617 0%, #020617 100%)'
  } as React.CSSProperties,

  card: {
    width: '420px',
    padding: '40px',
    borderRadius: '20px',
    background: 'rgba(15, 23, 42, 0.85)',
    border: '1px solid rgba(71,85,105,0.3)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    textAlign: 'center'
  } as React.CSSProperties,

  logo: {
    height: '48px',
    marginBottom: '20px'
  } as React.CSSProperties,

  title: {
    color: '#e2e8f0',
    fontSize: '26px',
    fontWeight: 800,
    marginBottom: '10px'
  } as React.CSSProperties,

  subtitle: {
    color: '#94a3b8',
    fontSize: '14px',
    marginBottom: '30px'
  } as React.CSSProperties,

  button: {
    width: '100%',
    padding: '14px',
    borderRadius: '12px',
    border: 'none',
    background: '#2563eb',
    color: '#fff',
    fontWeight: 700,
    fontSize: '15px',
    cursor: 'pointer'
  } as React.CSSProperties
};
