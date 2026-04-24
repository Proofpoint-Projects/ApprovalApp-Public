'use client';
import './globals.css';
import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    async function boot() {
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
          // 🔧 fallback melhor
          window.location.href = '/dashboard/quarantine';
          return;
        }

        const setup = await setupRes.json();

        if (setup?.requiresSetup) {
          if (me?.role === 'ADMIN') {
            window.location.href = '/setup';
            return;
          }

          window.location.href = '/setup/pending';
          return;
        }

        window.location.href = '/dashboard/quarantine';
      } catch {
        window.location.href = '/login';
      }
    }

    void boot();
  }, []);

  return null;
}