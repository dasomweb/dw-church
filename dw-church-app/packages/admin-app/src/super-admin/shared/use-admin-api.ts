import { useCallback } from 'react';
import { useAuthStore } from '../../stores/auth';

// snake_case → camelCase
function toCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

export function camelizeKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(camelizeKeys);
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [toCamel(k), camelizeKeys(v)]),
    );
  }
  return obj;
}

/** Authenticated fetch against /api/v1/admin/* with camelized JSON responses. */
export function useAdminApi() {
  const session = useAuthStore((s) => s.session);

  const apiFetch = useCallback(
    async <T,>(path: string, options?: RequestInit): Promise<T> => {
      const host = window.location.hostname;
      const baseUrl = host.startsWith('admin.')
        ? `https://api.${host.replace('admin.', '')}`
        : (import.meta.env.VITE_API_BASE_URL as string) || '';

      const headers: Record<string, string> = {
        Authorization: `Bearer ${session?.accessToken || ''}`,
        ...(options?.headers as Record<string, string>),
      };
      if (options?.body) {
        headers['Content-Type'] = 'application/json';
      }

      const res = await fetch(`${baseUrl}/api/v1/admin${path}`, {
        ...options,
        headers,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
        throw new Error(err.error?.message || `HTTP ${res.status}`);
      }
      const json = await res.json();
      return camelizeKeys(json) as T;
    },
    [session?.accessToken],
  );

  return apiFetch;
}
