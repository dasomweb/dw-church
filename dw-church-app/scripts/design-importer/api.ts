/**
 * api.ts — the real HTTP ImportClient (authoring-time). Talks to the existing
 * server APIs; no new endpoints. Credentials come from ENV only (never committed
 * or logged — playbook §3.5). Targets ONE tenant via the X-Tenant-Slug header.
 *
 * ENV:
 *   TL_API_BASE      default https://api-server-production-c612.up.railway.app
 *   TL_SUPER_EMAIL   super-admin email (or a tenant owner of the target tenant)
 *   TL_SUPER_PASSWORD
 */
import type { DesignTokens } from '@dw-church/design-tokens';
import type { ComposedPage, ImportClient } from './lib.js';

export interface HttpImportClient extends ImportClient {
  token: string;
  getPage(slug: string): Promise<{ id: string; sections: { block_type: string }[] } | null>;
}

const API_BASE = process.env.TL_API_BASE || 'https://api-server-production-c612.up.railway.app';

async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`login failed: HTTP ${res.status}`);
  const body = (await res.json()) as { accessToken?: string; data?: { accessToken?: string } };
  const token = body.accessToken ?? body.data?.accessToken;
  if (!token) throw new Error('login: no accessToken in response');
  return token;
}

/**
 * Build an HTTP ImportClient bound to ONE tenant (X-Tenant-Slug). Reads creds
 * from ENV. Every mutating call carries the tenant header + bearer token.
 */
export async function makeHttpClient(tenantSlug: string): Promise<HttpImportClient> {
  const email = process.env.TL_SUPER_EMAIL;
  const password = process.env.TL_SUPER_PASSWORD;
  if (!email || !password) {
    throw new Error('TL_SUPER_EMAIL / TL_SUPER_PASSWORD must be set in the environment (never commit them).');
  }
  const token = await login(email, password);
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Tenant-Slug': tenantSlug,
  };

  async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`${method} ${path} → HTTP ${res.status} ${txt.slice(0, 300)}`);
    }
    return (await res.json().catch(() => ({}))) as T;
  }

  return {
    token,
    async putThemeTokens(tokens: DesignTokens): Promise<void> {
      await req('PUT', '/api/v1/theme/tokens', tokens);
    },
    async createPage(page: ComposedPage['page']): Promise<{ id: string }> {
      // POST /pages returns the created page (201). super_admin bypasses plan/quota.
      const created = await req<{ id?: string; data?: { id?: string } }>('POST', '/api/v1/pages', page);
      const id = created.id ?? created.data?.id;
      if (!id) throw new Error('createPage: no id in response');
      return { id };
    },
    async addSection(pageId: string, section: ComposedPage['sections'][number]): Promise<void> {
      await req('POST', `/api/v1/pages/${pageId}/sections`, section);
    },
    async getPage(slug: string) {
      // GET /pages/:slug returns { page: {...}, sections: [...] } (also tolerate
      // a {data:{...}} or flat shape defensively).
      try {
        const p = await req<{
          page?: { id?: string };
          sections?: { block_type: string }[];
          data?: { page?: { id?: string }; id?: string; sections?: { block_type: string }[] };
          id?: string;
        }>('GET', `/api/v1/pages/${encodeURIComponent(slug)}`);
        const page = p.page ?? p.data?.page ?? p.data ?? p;
        const id = (page as { id?: string })?.id;
        const sections = p.sections ?? p.data?.sections ?? [];
        if (!id) return null;
        return { id, sections };
      } catch {
        return null;
      }
    },
  };
}
