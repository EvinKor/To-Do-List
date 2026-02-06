import { redirectToLogin } from './auth';

export async function apiFetch(path: string, options: RequestInit = {}) {
  const apiBase =
    ((import.meta as any).env?.VITE_API_BASE_URL as string) ||
    ((import.meta as any).env?.VITE_PUBLIC_BASE_URL as string) ||
    window.location.origin;
  const apiToken = (import.meta as any).env?.VITE_API_TOKEN as string | undefined;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (apiToken) headers.Authorization = `Bearer ${apiToken}`;

  const res = await fetch(`${apiBase.replace(/\/$/, '')}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const text = await res.text();
  if (res.status === 401) {
    redirectToLogin();
    return null;
  }
  if (!res.ok) throw new Error(text || `API error ${res.status}`);
  return text ? JSON.parse(text) : null;
}
