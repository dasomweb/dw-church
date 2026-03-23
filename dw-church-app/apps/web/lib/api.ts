/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Server-side API helpers for DW Church SaaS.
 * Uses plain fetch() with X-Tenant-Slug header for tenant identification.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.truelight.app';

// ─── Generic fetch helper ────────────────────────────────────

async function apiFetch<T>(slug: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Slug': slug,
      ...init?.headers,
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText} (${API_BASE}${path})`);
  }
  const data = await res.json() as any;
  return camelizeKeys(data);
}

// snake_case → camelCase converter
function toCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function camelizeKeys(obj: any): any {
  if (Array.isArray(obj)) return obj.map(camelizeKeys);
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [toCamel(k), camelizeKeys(v)])
    );
  }
  return obj;
}

// Alias API field names to match TypeScript types
// API: sermon_date → sermonDate, but type expects: date
const FIELD_ALIASES: Record<string, Record<string, string>> = {
  sermon: { sermonDate: 'date', preacherName: 'preacher', preacherId: '_preacherId' },
  bulletin: { bulletinDate: 'date' },
  staff: { sortOrder: 'order' },
};

function aliasFields(item: any, type: string): any {
  const map = FIELD_ALIASES[type];
  if (!map || !item || typeof item !== 'object') return item;
  const result = { ...item };
  for (const [from, to] of Object.entries(map)) {
    if (from in result && !(to in result)) {
      result[to] = result[from];
    }
  }
  return result;
}

function aliasArray(items: any[], type: string): any[] {
  return items.map((item) => aliasFields(item, type));
}

// Unwrap {data: ...} wrapper from API responses
function unwrap(res: any): any {
  if (res && typeof res === 'object' && 'data' in res) return res.data;
  return res;
}

// ─── Settings & Navigation ───────────────────────────────────

export async function getChurchSettings(slug: string): Promise<any> {
  const res = await apiFetch(slug, `/api/v1/settings`);
  return unwrap(res);
}

export async function getMenuItems(slug: string): Promise<any[]> {
  const res = await apiFetch(slug, `/api/v1/menus`);
  return unwrap(res) ?? [];
}

export async function getTheme(slug: string): Promise<any> {
  const res = await apiFetch(slug, `/api/v1/theme`);
  return unwrap(res);
}

// ─── Pages ───────────────────────────────────────────────────

export async function getPages(slug: string): Promise<any[]> {
  const res = await apiFetch(slug, `/api/v1/pages`);
  return unwrap(res) ?? [];
}

export async function getHomePage(slug: string): Promise<any> {
  const pages = await getPages(slug);
  const home = pages.find((p: any) => p.isHome || p.is_home || p.slug === 'home');
  if (!home) throw new Error('Home page not found');

  // Get sections for this page
  const sectionsRes = await apiFetch(slug, `/api/v1/pages/${home.id}/sections`);
  const sections = unwrap(sectionsRes) ?? [];

  return {
    ...home,
    sections: sections.map((s: any) => ({
      id: s.id,
      blockType: s.blockType ?? s.block_type,
      props: s.props ?? {},
      sortOrder: s.sortOrder ?? s.sort_order ?? 0,
      isVisible: s.isVisible ?? s.is_visible ?? true,
    })),
  };
}

export async function getPageBySlug(tenantSlug: string, pageSlug: string): Promise<any> {
  const pages = await getPages(tenantSlug);
  const page = pages.find((p: any) => p.slug === pageSlug);
  if (!page) throw new Error('Page not found');

  const sectionsRes = await apiFetch(tenantSlug, `/api/v1/pages/${page.id}/sections`);
  const sections = unwrap(sectionsRes) ?? [];

  return {
    ...page,
    sections: sections.map((s: any) => ({
      id: s.id,
      blockType: s.blockType ?? s.block_type,
      props: s.props ?? {},
      sortOrder: s.sortOrder ?? s.sort_order ?? 0,
      isVisible: s.isVisible ?? s.is_visible ?? true,
    })),
  };
}

// ─── Sermons ─────────────────────────────────────────────────

export async function getSermons(
  slug: string,
  params?: { page?: number; perPage?: number; category?: string; search?: string },
): Promise<any> {
  const p = new URLSearchParams();
  if (params?.page) p.set('page', String(params.page));
  if (params?.perPage) p.set('perPage', String(params.perPage));
  if (params?.category) p.set('category', params.category);
  if (params?.search) p.set('search', params.search);
  const qs = p.toString();
  const res = await apiFetch<any>(slug, `/api/v1/sermons${qs ? '?' + qs : ''}`);
  if (res?.data) res.data = aliasArray(res.data, 'sermon');
  return res;
}

export async function getSermon(slug: string, id: string): Promise<any> {
  const res = await apiFetch(slug, `/api/v1/sermons/${id}`);
  return aliasFields(unwrap(res), 'sermon');
}

// ─── Bulletins ───────────────────────────────────────────────

export async function getBulletins(
  slug: string,
  params?: { page?: number; perPage?: number },
): Promise<any> {
  const p = new URLSearchParams();
  if (params?.page) p.set('page', String(params.page));
  if (params?.perPage) p.set('perPage', String(params.perPage));
  const qs = p.toString();
  const res = await apiFetch<any>(slug, `/api/v1/bulletins${qs ? '?' + qs : ''}`);
  if (res?.data) res.data = aliasArray(res.data, 'bulletin');
  return res;
}

export async function getBulletin(slug: string, id: string): Promise<any> {
  const res = await apiFetch(slug, `/api/v1/bulletins/${id}`);
  return aliasFields(unwrap(res), 'bulletin');
}

// ─── Albums ──────────────────────────────────────────────────

export async function getAlbums(
  slug: string,
  params?: { page?: number; perPage?: number },
): Promise<any> {
  const p = new URLSearchParams();
  if (params?.page) p.set('page', String(params.page));
  if (params?.perPage) p.set('perPage', String(params.perPage));
  const qs = p.toString();
  return apiFetch(slug, `/api/v1/albums${qs ? '?' + qs : ''}`);
}

export async function getAlbum(slug: string, id: string): Promise<any> {
  const res = await apiFetch(slug, `/api/v1/albums/${id}`);
  return unwrap(res);
}

// ─── Staff ───────────────────────────────────────────────────

export async function getStaff(slug: string): Promise<any[]> {
  const res = await apiFetch(slug, `/api/v1/staff`);
  const items = unwrap(res) ?? [];
  return aliasArray(items, 'staff');
}

export async function getStaffMember(slug: string, id: string): Promise<any> {
  const res = await apiFetch(slug, `/api/v1/staff/${id}`);
  return aliasFields(unwrap(res), 'staff');
}

// ─── Columns ────────────────────────────────────────────────

export async function getColumns(
  slug: string,
  params?: { page?: number; perPage?: number; search?: string },
): Promise<any> {
  const p = new URLSearchParams();
  if (params?.page) p.set('page', String(params.page));
  if (params?.perPage) p.set('perPage', String(params.perPage));
  if (params?.search) p.set('search', params.search);
  const qs = p.toString();
  return apiFetch(slug, `/api/v1/columns${qs ? '?' + qs : ''}`);
}

export async function getColumn(slug: string, id: string): Promise<any> {
  const res = await apiFetch(slug, `/api/v1/columns/${id}`);
  return unwrap(res);
}

// ─── History ─────────────────────────────────────────────────

export async function getHistory(slug: string): Promise<any[]> {
  const res = await apiFetch(slug, `/api/v1/history`);
  return unwrap(res) ?? [];
}

// ─── Events ──────────────────────────────────────────────────

export async function getEvents(
  slug: string,
  params?: { page?: number; perPage?: number },
): Promise<any> {
  const p = new URLSearchParams();
  if (params?.page) p.set('page', String(params.page));
  if (params?.perPage) p.set('perPage', String(params.perPage));
  const qs = p.toString();
  return apiFetch(slug, `/api/v1/events${qs ? '?' + qs : ''}`);
}

export async function getEvent(slug: string, id: string): Promise<any> {
  const res = await apiFetch(slug, `/api/v1/events/${id}`);
  return unwrap(res);
}

// ─── Banners ─────────────────────────────────────────────────

export async function getBanners(slug: string): Promise<any[]> {
  const res = await apiFetch(slug, `/api/v1/banners?active=true`);
  return unwrap(res) ?? [];
}
