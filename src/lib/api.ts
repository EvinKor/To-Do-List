import { redirectToLogin } from './auth';
import axios from "axios";


export async function apiFetch(path: string, options: RequestInit = {}) {
  const envBase =
    ((import.meta as any).env?.VITE_API_BASE_URL as string) ||
    ((import.meta as any).env?.VITE_PUBLIC_BASE_URL as string) ||
    '';
  const apiBase = envBase.startsWith('/')
    ? `${window.location.origin}${envBase}`
    : envBase || window.location.origin;
  const apiToken = (import.meta as any).env?.VITE_API_TOKEN as string | undefined;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (apiToken) headers.Authorization = `Bearer ${apiToken}`;

  const method = (options.method || 'GET').toUpperCase();
  let data: any = undefined;
  if (options.body !== undefined) {
    if (typeof options.body === 'string') {
      try {
        data = JSON.parse(options.body);
      } catch {
        data = options.body;
      }
    } else {
      data = options.body;
    }
  }

  const doRequest = (baseURL: string) => {
    api.defaults.baseURL = baseURL;
    return api.request({
      url: path,
      method,
      headers,
      data,
      withCredentials: true,
    });
  };

  try {
    const res = await doRequest(apiBase);
    return res.data ?? null;
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 401) {
      redirectToLogin();
      return null;
    }
    if (apiBase !== window.location.origin) {
      const proxyBase = `${window.location.origin}/api`;
      const res = await doRequest(proxyBase);
      return res.data ?? null;
    }
    throw err;
  }
}


export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, 
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Optional: basic error unwrap
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err.message;
    return Promise.reject(new Error(msg));
  }
);
