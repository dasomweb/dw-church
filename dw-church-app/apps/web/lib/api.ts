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
  return data;
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
  const home = pages.find((p: any) => p.is_home || p.slug === 'home');
  if (!home) throw new Error('Home page not found');

  // Get sections for this page
  const sectionsRes = await apiFetch(slug, `/api/v1/pages/${home.id}/sections`);
  const sections = unwrap(sectionsRes) ?? [];

  return {
    ...home,
    sections: sections.map((s: any) => ({
      id: s.id,
      blockType: s.block_type,
      props: s.props ?? {},
      sortOrder: s.sort_order ?? 0,
      isVisible: s.is_visible ?? true,
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
      blockType: s.block_type,
      props: s.props ?? {},
      sortOrder: s.sort_order ?? 0,
      isVisible: s.is_visible ?? true,
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
  return apiFetch(slug, `/api/v1/sermons${qs ? '?' + qs : ''}`);
}

export async function getSermon(slug: string, id: string): Promise<any> {
  const res = await apiFetch(slug, `/api/v1/sermons/${id}`);
  return unwrap(res);
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
  return apiFetch(slug, `/api/v1/bulletins${qs ? '?' + qs : ''}`);
}

export async function getBulletin(slug: string, id: string): Promise<any> {
  const res = await apiFetch(slug, `/api/v1/bulletins/${id}`);
  return unwrap(res);
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
  return unwrap(res) ?? [];
}

export async function getStaffMember(slug: string, id: string): Promise<any> {
  const res = await apiFetch(slug, `/api/v1/staff/${id}`);
  return unwrap(res);
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
