'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';

type Me = {
  email?: string;
  displayName?: string;
  role?: 'ADMIN' | 'APPROVER' | string;
};

const styles: Record<string, CSSProperties> = {
  shell: {
    minHeight: '100vh',
    display: 'grid',
    gridTemplateColumns: '260px minmax(0, 1fr)',
    background: '#020617',
    transition: 'grid-template-columns 0.2s ease',
    overflowX: 'hidden'
  },
  sidebar: {
    borderRight: '1px solid rgba(71, 85, 105, 0.35)',
    background: 'linear-gradient(180deg, rgba(8,22,58,0.98) 0%, rgba(2,6,23,0.98) 100%)',
    padding: 18,
    display: 'grid',
    alignContent: 'start',
    gap: 18,
    position: 'sticky',
    top: 0,
    height: '100vh',
    overflow: 'hidden',
    transition: 'all 0.2s ease',
    width: '100%',
    boxSizing: 'border-box',
    minWidth: 0
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 18,
    borderBottom: '1px solid rgba(71, 85, 105, 0.35)',
    minWidth: 0,
    overflow: 'hidden'
  },
  brandLogo: {
    height: 28,
    width: 'auto',
    objectFit: 'contain',
    flexShrink: 0
  },
  brandTextWrap: {
    display: 'grid',
    gap: 2,
    minWidth: 0,
    overflow: 'hidden'
  },
  brandText: {
    color: '#e5eefc',
    fontWeight: 800,
    fontSize: 12,
    lineHeight: 1.1
  },
  brandSubtext: {
    color: '#94a3b8',
    fontWeight: 600,
    fontSize: 14,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    whiteSpace: 'normal',        // permite quebrar linha
    wordBreak: 'break-word',     // quebra palavras longas
    lineHeight: 1.2              // opcional: melhora leitura
  },
  nav: {
    display: 'grid',
    gap: 8
  },
  navItem: {
    display: 'block',
    padding: '12px 14px',
    borderRadius: 12,
    color: '#cbd5e1',
    textDecoration: 'none',
    fontWeight: 700,
    border: '1px solid transparent',
    background: 'transparent',
    transition: 'all 0.15s ease',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  navItemActive: {
    display: 'block',
    padding: '12px 14px',
    borderRadius: 12,
    color: '#eff6ff',
    textDecoration: 'none',
    fontWeight: 700,
    border: '1px solid rgba(96,165,250,0.35)',
    background: 'rgba(59,130,246,0.18)',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.02)',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  contentWrap: {
    display: 'grid',
    gridTemplateRows: '64px 1fr',
    minWidth: 0,
    width: '100%',
    overflowX: 'hidden'
  },
  topbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 18px',
    borderBottom: '1px solid rgba(71, 85, 105, 0.35)',
    background: 'rgba(8,22,58,0.92)',
    position: 'sticky',
    top: 0,
    zIndex: 20,
    backdropFilter: 'blur(8px)',
    minWidth: 0,
    width: '100%',
    boxSizing: 'border-box',
    overflow: 'visible'
  },
  pageTitle: {
    color: '#e5eefc',
    fontWeight: 800,
    fontSize: 20,
    lineHeight: 1.2,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    wordBreak: 'break-word',
    whiteSpace: 'nowrap'
  },
  topbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12
  },
  roleBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 10px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    background: 'rgba(30, 41, 59, 0.68)',
    border: '1px solid rgba(96, 165, 250, 0.18)',
    color: '#dbeafe',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  userButton: {
    width: 38,
    height: 38,
    borderRadius: 999,
    border: '1px solid rgba(96,165,250,0.35)',
    background: 'linear-gradient(180deg, rgba(59,130,246,0.24) 0%, rgba(37,99,235,0.16) 100%)',
    color: '#eff6ff',
    fontWeight: 800,
    cursor: 'pointer',
    fontSize: 14
  },
  dropdown: {
    position: 'absolute',
    top: 46,
    right: 0,
    minWidth: 240,
    background: '#081225',
    border: '1px solid rgba(71,85,105,0.35)',
    borderRadius: 16,
    boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
    overflow: 'hidden',
    zIndex: 200
  },
  dropdownHeader: {
    padding: '14px 16px',
    borderBottom: '1px solid rgba(71,85,105,0.25)',
    display: 'grid',
    gap: 4
  },
  dropdownName: {
    color: '#e5eefc',
    fontWeight: 800,
    fontSize: 14
  },
  dropdownEmail: {
    color: '#94a3b8',
    fontSize: 13
  },
  dropdownItem: {
    width: '100%',
    textAlign: 'left',
    background: 'transparent',
    border: 'none',
    color: '#f8fafc',
    padding: '12px 16px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  content: {
    padding: 18,
    minWidth: 0,
    width: '100%',
    overflowX: 'hidden'
  }
};

const navItems = [
  { href: '/dashboard/quarantine', label: 'Quarentena de e-mail', icon: '📧', roles: ['ADMIN', 'APPROVER'] },
  { href: '/dashboard/endpoint-itm', label: 'Endpoint / ITM / DLP', icon: '💻', roles: ['ADMIN'] },
  { href: '/dashboard/approvals', label: 'Minhas aprovações', icon: '✅', roles: ['ADMIN', 'APPROVER'] },
  { href: '/dashboard/audit', label: 'Trilha de Auditoria', icon: '🧾', roles: ['ADMIN'] },
  { href: '/dashboard/settings/approvers', label: 'Aprovadores de quarentena (admin)', icon: '👥', roles: ['ADMIN'] },
  { href: '/dashboard/settings/proofpoint-tokens', label: 'Tokens Proofpoint (admin)', icon: '🔐', roles: ['ADMIN'] }
];

function getTitle(pathname: string) {
  if (pathname.startsWith('/dashboard/quarantine')) return 'Emails aguardando aprovação';
  if (pathname.startsWith('/dashboard/endpoint-itm')) return 'Eventos de endpoint aguardando decisão do aprovador';
  if (pathname.startsWith('/dashboard/approvals')) return 'Histórico de Aprovações';
  if (pathname.startsWith('/dashboard/audit')) return 'Trilha de Auditoria';
  if (pathname.startsWith('/dashboard/settings/approvers')) return 'Cadastro de pastas dos aprovadores';
  if (pathname.startsWith('/dashboard/settings/proofpoint-tokens')) return 'Tokens Proofpoint';
  if (pathname.startsWith('/setup')) return 'Setup';
  if (pathname.startsWith('/login')) return 'Login';
  return 'Approval Portal';
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [me, setMe] = useState<Me | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const pageTitle = getTitle(pathname);

  async function loadMe() {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include'
      });

      if (!res.ok) {
        setMe(null);
        return;
      }

      const data = await res.json();
      setMe(data || null);
    } catch {
      setMe(null);
    }
  }

  useEffect(() => {
    void loadMe();
  }, []);

  useEffect(() => {
    function syncLayout() {
      const mobile = window.innerWidth <= 900;
      setIsMobile(mobile);

      if (mobile) {
        setSidebarCollapsed(true);
      }
    }

    syncLayout();
    window.addEventListener('resize', syncLayout);
    return () => window.removeEventListener('resize', syncLayout);
  }, []);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const initials = useMemo(() => {
    const source = me?.displayName || me?.email || 'U';
    return source.trim().charAt(0).toUpperCase();
  }, [me]);

  const visibleNavItems = useMemo(() => {
    const role = String(me?.role || '').toUpperCase();
    return navItems.filter((item) => !item.roles || item.roles.includes(role));
  }, [me]);

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } finally {
      router.push('/login?loggedOut=true');
      router.refresh();
    }
  }

  const hideShell = pathname === '/login' || pathname === '/setup';

  if (hideShell) {
    return <>{children}</>;
  }

  return (
    <div
      style={{
        ...styles.shell,
        gridTemplateColumns: sidebarCollapsed ? '72px minmax(0, 1fr)' : '260px minmax(0, 1fr)'
      }}
    >
      <aside
        style={{
          ...styles.sidebar,
          padding: sidebarCollapsed ? 12 : 18,
          width: sidebarCollapsed ? 72 : 260,
          alignContent: 'start'
        }}
      >
       
        {!sidebarCollapsed ? (
          <div
            style={{
              ...styles.brand,
              justifyContent: 'flex-start'
            }}
          >
            <img
              src="/proofpoint-logo.png"
              alt="Proofpoint"
              style={styles.brandLogo}
            />

            <div style={styles.brandTextWrap}>
              <div style={styles.brandSubtext}>Approval Portal</div>
            </div>
          </div>
        ) : null}

        <nav style={styles.nav}>
          {visibleNavItems.map((item) => {
            const active = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                style={{
                  ...(active ? styles.navItemActive : styles.navItem),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  gap: sidebarCollapsed ? 0 : 10
                }}
              >
                <span style={{ fontSize: sidebarCollapsed ? 18 : 16 }}>
                  {item.icon}
                </span>

                {!sidebarCollapsed && (
                  <span>{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            paddingLeft: sidebarCollapsed ? 0 : 16
          }}
        >
          <button
            type="button"
            onClick={() => setSidebarCollapsed((v) => !v)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              border: '1px solid rgba(100,116,139,0.45)',
              background: 'transparent',
              color: '#e2e8f0',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0
            }}
            aria-label={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {sidebarCollapsed ? '>>' : '<<'}
          </button>
        </div>
      </aside>

      <div style={{ ...styles.contentWrap, minWidth: 0 }}>
        <header style={styles.topbar}>
          <div style={styles.pageTitle}>{pageTitle}</div>

          <div style={styles.topbarRight}>
            {me?.role ? (
              <span style={styles.roleBadge}>{me.role}</span>
            ) : null}

            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                style={styles.userButton}
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Abrir menu do usuário"
              >
                {initials}
              </button>

              {menuOpen ? (
                <div style={styles.dropdown}>
                  <div style={styles.dropdownHeader}>
                    <div style={styles.dropdownName}>{me?.displayName || 'Usuário'}</div>
                    <div style={styles.dropdownEmail}>{me?.email || '-'}</div>
                  </div>

                  <button
                    type="button"
                    style={styles.dropdownItem}
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main
          style={{
            ...styles.content,
            padding: isMobile ? 12 : 18
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}