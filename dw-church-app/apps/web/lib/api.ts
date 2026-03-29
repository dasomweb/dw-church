/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Server-side API helpers for DW Church SaaS.
 * Uses plain fetch() with X-Tenant-Slug header for tenant identification.
 *
 * ISR caching strategy:
 *   revalidate: 300  – settings, theme, menus, history (rarely change)
 *   revalidate: 120  – pages, banners, staff
 *   revalidate: 60   – content lists & individual items (sermons, bulletins, …)
 *   revalidate: false – search results (never cache)
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api-server-production-c612.up.railway.app';

// ─── Generic fetch helper ────────────────────────────────────

async function apiFetch<T>(
  slug: string,
  path: string,
  init?: RequestInit & { revalidate?: number | false },
): Promise<T> {
  const { revalidate, ...rest } = init ?? {};

  const fetchInit: RequestInit = {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Slug': slug,
      ...rest?.headers,
    },
  };

  // Apply caching strategy
  if (revalidate === false) {
    fetchInit.cache = 'no-store';
  } else if (revalidate !== undefined) {
    fetchInit.next = { revalidate };
  } else {
    // Default: revalidate every 60 seconds
    fetchInit.next = { revalidate: 60 };
  }

  const res = await fetch(`${API_BASE}${path}`, fetchInit);
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
  const res = await apiFetch(slug, `/api/v1/settings`, { revalidate: 300 });
  return unwrap(res);
}

export async function getMenuItems(slug: string): Promise<any[]> {
  const res = await apiFetch(slug, `/api/v1/menus`, { revalidate: 300 });
  return unwrap(res) ?? [];
}

export async function getTheme(slug: string): Promise<any> {
  const res = await apiFetch(slug, `/api/v1/theme`, { revalidate: 300 });
  return unwrap(res);
}

// ─── Pages ───────────────────────────────────────────────────

export async function getPages(slug: string): Promise<any[]> {
  const res = await apiFetch(slug, `/api/v1/pages`, { revalidate: 120 });
  return unwrap(res) ?? [];
}

export async function getHomePage(slug: string): Promise<any> {
  const pages = await getPages(slug);
  const home = pages.find((p: any) => p.isHome || p.slug === 'home');
  if (!home) throw new Error('Home page not found');

  // Get sections for this page
  const sectionsRes = await apiFetch(slug, `/api/v1/pages/${home.id}/sections`, { revalidate: 120 });
  const sections = unwrap(sectionsRes) ?? [];

  return {
    ...home,
    sections: sections.map((s: any) => ({
      id: s.id,
      blockType: s.blockType,
      props: s.props ?? {},
      sortOrder: s.sortOrder ?? 0,
      isVisible: s.isVisible ?? true,
    })),
  };
}

export async function getPageBySlug(tenantSlug: string, pageSlug: string): Promise<any> {
  const pages = await getPages(tenantSlug);
  const page = pages.find((p: any) => p.slug === pageSlug);
  if (!page) throw new Error('Page not found');

  const sectionsRes = await apiFetch(tenantSlug, `/api/v1/pages/${page.id}/sections`, { revalidate: 120 });
  const sections = unwrap(sectionsRes) ?? [];

  return {
    ...page,
    sections: sections.map((s: any) => ({
      id: s.id,
      blockType: s.blockType,
      props: s.props ?? {},
      sortOrder: s.sortOrder ?? 0,
      isVisible: s.isVisible ?? true,
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

  // No cache for search results, 60s revalidation for regular lists
  const revalidate = params?.search ? false as const : 60;
  const res = await apiFetch<any>(slug, `/api/v1/sermons${qs ? '?' + qs : ''}`, { revalidate });
  if (res?.data) res.data = aliasArray(res.data, 'sermon');
  return res;
}

export async function getSermon(slug: string, id: string): Promise<any> {
  const res = await apiFetch(slug, `/api/v1/sermons/${id}`, { revalidate: 60 });
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
  const res = await apiFetch<any>(slug, `/api/v1/bulletins${qs ? '?' + qs : ''}`, { revalidate: 60 });
  if (res?.data) res.data = aliasArray(res.data, 'bulletin');
  return res;
}

export async function getBulletin(slug: string, id: string): Promise<any> {
  const res = await apiFetch(slug, `/api/v1/bulletins/${id}`, { revalidate: 60 });
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
  return apiFetch(slug, `/api/v1/albums${qs ? '?' + qs : ''}`, { revalidate: 60 });
}

export async function getAlbum(slug: string, id: string): Promise<any> {
  const res = await apiFetch(slug, `/api/v1/albums/${id}`, { revalidate: 60 });
  return unwrap(res);
}

// ─── Staff ───────────────────────────────────────────────────

export async function getStaff(slug: string): Promise<any[]> {
  const res = await apiFetch(slug, `/api/v1/staff`, { revalidate: 120 });
  const items = unwrap(res) ?? [];
  return aliasArray(items, 'staff');
}

export async function getStaffMember(slug: string, id: string): Promise<any> {
  const res = await apiFetch(slug, `/api/v1/staff/${id}`, { revalidate: 60 });
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

  // No cache for search results, 60s revalidation for regular lists
  const revalidate = params?.search ? false as const : 60;
  return apiFetch(slug, `/api/v1/columns${qs ? '?' + qs : ''}`, { revalidate });
}

export async function getColumn(slug: string, id: string): Promise<any> {
  const res = await apiFetch(slug, `/api/v1/columns/${id}`, { revalidate: 60 });
  return unwrap(res);
}

// ─── History ─────────────────────────────────────────────────

export async function getHistory(slug: string): Promise<any[]> {
  const res = await apiFetch(slug, `/api/v1/history`, { revalidate: 300 });
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
  return apiFetch(slug, `/api/v1/events${qs ? '?' + qs : ''}`, { revalidate: 60 });
}

export async function getEvent(slug: string, id: string): Promise<any> {
  const res = await apiFetch(slug, `/api/v1/events/${id}`, { revalidate: 60 });
  return unwrap(res);
}

// ─── Banners ─────────────────────────────────────────────────

export async function getBanners(slug: string): Promise<any[]> {
  const res = await apiFetch(slug, `/api/v1/banners?active=true`, { revalidate: 120 });
  return unwrap(res) ?? [];
}
