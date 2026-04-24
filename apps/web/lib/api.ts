export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {})
    },
    cache: 'no-store'
  });

  if (response.status === 401) {
    window.location.href = '/login';
    throw new Error('Nao autenticado');
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Falha em ${path}`);
  }

  return response.json() as Promise<T>;
}
