import type { ReactNode } from 'react';

export const metadata = {
  title: 'Approval Portal',
  icons: {
    icon: '/favicon.png'
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, background: '#020617', color: '#e5eefc' }}>
        {children}
      </body>
    </html>
  );
}