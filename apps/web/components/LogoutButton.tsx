'use client';

export default function LogoutButton() {
  async function onLogout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/login';
  }

  return (
    <button type="button" className="button ghost" onClick={onLogout}>
      Sair
    </button>
  );
}
