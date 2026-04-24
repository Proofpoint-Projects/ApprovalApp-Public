import Image from 'next/image';
import Link from 'next/link';

const styles = {
  page: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    padding: '32px',
    background: 'linear-gradient(180deg, #020817 0%, #03113a 100%)',
  } as React.CSSProperties,
  card: {
    width: '100%',
    maxWidth: '760px',
    background: 'rgba(8, 22, 58, 0.92)',
    border: '1px solid rgba(71, 85, 105, 0.35)',
    borderRadius: '28px',
    padding: '40px 36px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.28)',
    textAlign: 'center' as const,
  } as React.CSSProperties,
  logoWrap: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '26px',
  } as React.CSSProperties,
  eyebrow: {
    display: 'inline-flex',
    padding: '8px 14px',
    borderRadius: '999px',
    border: '1px solid rgba(96,165,250,0.28)',
    background: 'rgba(59,130,246,0.12)',
    color: '#bfdbfe',
    fontSize: '12px',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    marginBottom: '18px',
  } as React.CSSProperties,
  code: {
    fontSize: '72px',
    lineHeight: 1,
    fontWeight: 900,
    color: '#f8fafc',
    marginBottom: '12px',
  } as React.CSSProperties,
  title: {
    fontSize: '30px',
    lineHeight: 1.2,
    fontWeight: 800,
    color: '#e5eefc',
    marginBottom: '14px',
  } as React.CSSProperties,
  subtitle: {
    fontSize: '17px',
    lineHeight: 1.7,
    color: '#94a3b8',
    marginBottom: '28px',
  } as React.CSSProperties,
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '14px 18px',
    borderRadius: '16px',
    border: 'none',
    background: '#75a9ff',
    color: '#081225',
    fontWeight: 800,
    fontSize: '15px',
    textDecoration: 'none',
  } as React.CSSProperties,
  secondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '14px 18px',
    borderRadius: '16px',
    border: '1px solid rgba(100,116,139,0.45)',
    background: 'transparent',
    color: '#e2e8f0',
    fontWeight: 700,
    fontSize: '15px',
    textDecoration: 'none',
  } as React.CSSProperties,
};

export default function NotFound() {
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoWrap}>
          <Image
            src="/proofpoint-logo.png"
            alt="Proofpoint"
            objectFit="contain"
            height={26}
            priority
          />
        </div>

        <div style={styles.eyebrow}>Approval Portal</div>

        <div style={styles.code}>404</div>
        <div style={styles.title}>Página não encontrada</div>
        <div style={styles.subtitle}>
          A página que você tentou acessar não existe ou não está disponível neste ambiente.
          Volte ao portal e continue a navegação a partir das páginas principais.
        </div>

        <div style={styles.actions}>
          <Link href="/dashboard/quarantine" style={styles.primaryButton}>
            Ir para Quarentena
          </Link>

          <Link href="/login" style={styles.secondaryButton}>
            Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  );
}
