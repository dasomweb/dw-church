/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Server-side API helpers for DW Church SaaS.
 * Uses plain fetch() with X-Tenant-Slug header for tenant identification.
 *
 * ISR caching strategy (per-tenant, tag-invalidated):
 *   CACHE_CHROME  – settings, theme, tokens, menus, pages, sections, features
 *                   (every page renders these; rarely change)
 *   CACHE_CONTENT – content lists & items (sermons, bulletins, staff, …)
 *   false         – search results & mutations (never cache)
 *
 * ⚠️ CACHE-KEY COLLISION GUARD: Next.js keys its Data Cache by URL, NOT by
 * request headers. Since every tenant hits the same API path and differs only
 * by the X-Tenant-Slug *header*, a cached response would be shared across
 * tenants (tenant A seeing tenant B's data). We therefore append a harmless
 * `_t=<slug>` query param to CACHED requests so each tenant gets a distinct
 * cache key. The server identifies the tenant by header and ignores `_t`.
 * (no-store requests skip this — they are never cached, so no collision.)
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.truelight.app';

// Cache windows (seconds). Worst-case public staleness after an admin publish;
// the server also fires a per-tenant tag purge on every mutation for immediacy.
const CACHE_CHROME = 300;
const CACHE_CONTENT = 120;

// ─── Generic fetch helper ────────────────────────────────────

async function apiFetch<T>(
  slug: string,
  path: string,
  init?: RequestInit & { revalidate?: number | false; tags?: string[] },
): Promise<T> {
  const { revalidate, tags, ...rest } = init ?? {};

  const fetchInit: RequestInit = {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Slug': slug,
      ...rest?.headers,
    },
  };

  const url = new URL(`${API_BASE}${path}`);

  // Apply caching strategy
  if (revalidate === false) {
    fetchInit.cache = 'no-store';
  } else {
    const seconds = revalidate === undefined ? CACHE_CHROME : revalidate;
    // Per-tenant tag lets the server purge one tenant's whole cache on publish.
    fetchInit.next = { revalidate: seconds, tags: [`tenant:${slug}`, ...(tags ?? [])] };
    url.searchParams.set('_t', slug); // collision guard — see file header
  }

  const res = await fetch(url.toString(), fetchInit);
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
  const res = await apiFetch(slug, `/api/v1/settings`, { revalidate: CACHE_CHROME });
  return unwrap(res);
}

export async function getMenuItems(slug: string): Promise<any[]> {
  const res = await apiFetch(slug, `/api/v1/menus`, { revalidate: CACHE_CHROME });
  return unwrap(res) ?? [];
}

export async function getTheme(slug: string): Promise<any> {
  const res = await apiFetch(slug, `/api/v1/theme`, { revalidate: CACHE_CHROME });
  return unwrap(res);
}

/**
 * Lightweight tenant meta used to gate plan-only features (e.g. the PWA/mobile
 * app experience). `features.pwa` is true only on the Pro plan. Resilient:
 * on any error returns a safe default so the storefront never breaks.
 */
export async function getSiteMeta(slug: string): Promise<{
  slug: string;
  name: string;
  plan: string;
  features: { pwa: boolean };
}> {
  try {
    const res = await apiFetch<any>(slug, `/api/v1/site-meta`, { revalidate: 300 });
    const data = unwrap(res) ?? {};
    return {
      slug: data.slug ?? slug,
      name: data.name ?? slug,
      plan: data.plan ?? 'basic',
      features: { pwa: Boolean(data.features?.pwa) },
    };
  } catch {
    return { slug, name: slug, plan: 'basic', features: { pwa: false } };
  }
}

/**
 * Fetch the full DesignTokens snapshot for a tenant. The server endpoint
 * projects legacy `settings.colors/fonts` through `legacyThemeToTokens()`
 * when `settings.tokensV2` isn't set, so this always returns a valid
 * shape even for tenants that never touched the new ThemeEditor.
 *
 * Used by tenant layout to emit `--brand-*` CSS variables — the single
 * source of truth across storefront + admin live preview + AI Designer.
 */
export async function getThemeTokens(slug: string): Promise<any> {
  const res = await apiFetch(slug, `/api/v1/theme/tokens`, { revalidate: CACHE_CHROME });
  return unwrap(res);
}

// ─── Pages ───────────────────────────────────────────────────

export async function getPages(slug: string): Promise<any[]> {
  const res = await apiFetch(slug, `/api/v1/pages`, { revalidate: CACHE_CHROME });
  return unwrap(res) ?? [];
}

/** Fetch a single reusable content entry (CONTENT layer). */
export async function getContentEntry(slug: string, id: string): Promise<any> {
  const res = await apiFetch(slug, `/api/v1/content-entries/${id}`, { revalidate: CACHE_CHROME });
  return unwrap(res);
}

/**
 * Resolve Sections that reference a content entry (props.contentEntryId):
 * merge the entry's CONTENT over the section, while DESIGN (blockStyle /
 * elementStyles) stays from the section. Sections that inline their content
 * (no contentEntryId) pass through untouched — fully backward compatible.
 */
async function resolveSectionEntries(slug: string, sections: any[]): Promise<any[]> {
  return Promise.all(sections.map(async (s: any) => {
    const entryId = s?.props?.contentEntryId;
    if (!entryId) return s;
    try {
      const entry = await getContentEntry(slug, entryId);
      const data = (entry?.data ?? {}) as Record<string, unknown>;
      return {
        ...s,
        props: { ...s.props, ...data, blockStyle: s.props?.blockStyle, elementStyles: s.props?.elementStyles },
      };
    } catch {
      return s; // entry deleted/unavailable — fall back to inline props
    }
  }));
}

// ─── Storefront add-on hard-gating ──────────────────────────────────────────
// Blocks that belong to a paid add-on: if the tenant's add-on is OFF, the public
// site must NOT render them (예: 스몰그룹 미사용 시 목장 블록 숨김). Mirrors the
// admin BLOCK_FEATURE map (packages/admin-app plan-features.ts). Base blocks
// (sermons/albums/contact_form/…) are ungated and always render.
const STOREFRONT_BLOCK_FEATURE: Record<string, string> = {
  cell_grid: 'smallgroup',
  cell_report: 'smallgroup',
  newcomer_info: 'newcomer',
  newcomer_form: 'newcomer',
};

/** Effective add-on feature map for the tenant (public endpoint). {} on failure
 *  so a features outage never blanks the site (fail-open — only add-on blocks
 *  are affected, and hiding them requires an explicit `false`). */
export async function getStorefrontFeatures(slug: string): Promise<Record<string, boolean>> {
  try {
    const res = await apiFetch<any>(slug, `/api/v1/storefront/features`, { revalidate: CACHE_CHROME });
    return (unwrap(res)?.features ?? {}) as Record<string, boolean>;
  } catch {
    return {};
  }
}

/** Drop sections (and layout children) whose add-on feature is explicitly OFF. */
function filterSectionsByFeatures(sections: any[], features: Record<string, boolean>): any[] {
  const allowed = (blockType: string): boolean => {
    const key = STOREFRONT_BLOCK_FEATURE[blockType];
    return !key || features[key] !== false;
  };
  return sections
    .filter((s: any) => allowed(s.blockType))
    .map((s: any) => {
      const children = s?.props?.children;
      if (Array.isArray(children)) {
        return { ...s, props: { ...s.props, children: children.filter((c: any) => allowed(c?.blockType)) } };
      }
      return s;
    });
}

export async function getHomePage(slug: string): Promise<any> {
  const pages = await getPages(slug);
  const home = pages.find((p: any) => p.isHome || p.slug === 'home');
  if (!home) throw new Error('Home page not found');

  // Get sections for this page
  const sectionsRes = await apiFetch(slug, `/api/v1/pages/${home.id}/sections`, { revalidate: CACHE_CHROME });
  const sections = unwrap(sectionsRes) ?? [];
  const features = await getStorefrontFeatures(slug);

  return {
    ...home,
    sections: filterSectionsByFeatures(await resolveSectionEntries(slug, sections.map((s: any) => ({
      id: s.id,
      blockType: s.blockType,
      props: s.props ?? {},
      sortOrder: s.sortOrder ?? 0,
      isVisible: s.isVisible ?? true,
    }))), features),
  };
}

export async function getPageBySlug(tenantSlug: string, pageSlug: string): Promise<any> {
  const pages = await getPages(tenantSlug);
  const page = pages.find((p: any) => p.slug === pageSlug);
  if (!page) throw new Error('Page not found');

  const sectionsRes = await apiFetch(tenantSlug, `/api/v1/pages/${page.id}/sections`, { revalidate: CACHE_CHROME });
  const sections = unwrap(sectionsRes) ?? [];
  const features = await getStorefrontFeatures(tenantSlug);

  return {
    ...page,
    sections: filterSectionsByFeatures(await resolveSectionEntries(tenantSlug, sections.map((s: any) => ({
      id: s.id,
      blockType: s.blockType,
      props: s.props ?? {},
      sortOrder: s.sortOrder ?? 0,
      isVisible: s.isVisible ?? true,
    }))), features),
  };
}

/**
 * Find a content-detail template page by its `kind`
 * (sermon_detail / column_detail / bulletin_detail) and return its visible
 * sections, sorted. Returns null when the tenant hasn't designed one — the
 * caller then falls back to the built-in fixed detail layout.
 */
export async function getDetailTemplate(
  tenantSlug: string,
  kind: string,
): Promise<{ id: string; blockType: string; props: any; sortOrder: number; isVisible: boolean }[] | null> {
  let pages: any[];
  try {
    pages = await getPages(tenantSlug);
  } catch {
    return null;
  }
  const template = pages.find((p: any) => p.kind === kind && (p.status === 'published' || p.status === undefined));
  if (!template) return null;

  const sectionsRes = await apiFetch(tenantSlug, `/api/v1/pages/${template.id}/sections`, { revalidate: CACHE_CHROME });
  const sections = (unwrap(sectionsRes) ?? []) as any[];
  const mapped = sections
    .map((s: any) => ({
      id: s.id,
      blockType: s.blockType,
      props: s.props ?? {},
      sortOrder: s.sortOrder ?? 0,
      isVisible: s.isVisible ?? true,
    }))
    .filter((s) => s.isVisible)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return resolveSectionEntries(tenantSlug, mapped);
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
  const res = await apiFetch(slug, `/api/v1/sermons/${id}`, { revalidate: CACHE_CONTENT });
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
  const res = await apiFetch<any>(slug, `/api/v1/bulletins${qs ? '?' + qs : ''}`, { revalidate: CACHE_CONTENT });
  if (res?.data) res.data = aliasArray(res.data, 'bulletin');
  return res;
}

export async function getBulletin(slug: string, id: string): Promise<any> {
  const res = await apiFetch(slug, `/api/v1/bulletins/${id}`, { revalidate: CACHE_CONTENT });
  return aliasFields(unwrap(res), 'bulletin');
}

// ─── Albums ──────────────────────────────────────────────────

export async function getAlbums(
  slug: string,
  params?: { page?: number; perPage?: number; category?: string },
): Promise<any> {
  const p = new URLSearchParams();
  if (params?.page) p.set('page', String(params.page));
  if (params?.perPage) p.set('perPage', String(params.perPage));
  if (params?.category) p.set('category', params.category);
  const qs = p.toString();
  return apiFetch(slug, `/api/v1/albums${qs ? '?' + qs : ''}`, { revalidate: CACHE_CONTENT });
}

export async function getAlbum(slug: string, id: string): Promise<any> {
  const res = await apiFetch(slug, `/api/v1/albums/${id}`, { revalidate: CACHE_CONTENT });
  return unwrap(res);
}

// ─── Marketing config (platform branding + SEO/OG, no tenant) ─
export async function getMarketingConfig(): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/marketing-config`, { next: { revalidate: 300 } });
    if (!res.ok) return {};
    const json = (await res.json()) as any;
    return (json?.data ?? json ?? {}) as any;
  } catch {
    return {};
  }
}

// ─── Portfolio / case studies (platform-level, no tenant) ─────
export async function getCaseStudies(): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/case-studies`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const json = (await res.json()) as any;
    return (json?.data ?? json ?? []) as any[];
  } catch {
    return [];
  }
}

// ─── Videos (영상 게시판) ─────────────────────────────────────

export async function getVideos(
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
  return apiFetch(slug, `/api/v1/videos${qs ? '?' + qs : ''}`, { revalidate });
}

// ─── Schedules (예배 및 모임) ─────────────────────────────────

export async function getSchedules(slug: string): Promise<any[]> {
  const res = await apiFetch(slug, `/api/v1/schedules`, { revalidate: 60 });
  return unwrap(res) ?? [];
}

// ─── Staff ───────────────────────────────────────────────────

export async function getStaff(slug: string): Promise<any[]> {
  const res = await apiFetch(slug, `/api/v1/staff`, { revalidate: CACHE_CONTENT });
  const items = unwrap(res) ?? [];
  return aliasArray(items, 'staff');
}

export async function getStaffMember(slug: string, id: string): Promise<any> {
  const res = await apiFetch(slug, `/api/v1/staff/${id}`, { revalidate: CACHE_CONTENT });
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
  const res = await apiFetch(slug, `/api/v1/columns/${id}`, { revalidate: CACHE_CONTENT });
  return unwrap(res);
}

// ─── History ─────────────────────────────────────────────────

export async function getHistory(slug: string): Promise<any[]> {
  const res = await apiFetch(slug, `/api/v1/history`, { revalidate: CACHE_CONTENT });
  return unwrap(res) ?? [];
}

// ─── Cells (목장/셀) ──────────────────────────────────────────

export async function getCells(slug: string): Promise<any[]> {
  const res = await apiFetch(slug, `/api/v1/cells`, { revalidate: 60 });
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
  return apiFetch(slug, `/api/v1/events${qs ? '?' + qs : ''}`, { revalidate: CACHE_CONTENT });
}

export async function getEvent(slug: string, id: string): Promise<any> {
  const res = await apiFetch(slug, `/api/v1/events/${id}`, { revalidate: CACHE_CONTENT });
  return unwrap(res);
}

// ─── Verses (오늘의 말씀) ──────────────────────────────────────

export async function getCurrentVerse(slug: string): Promise<any> {
  const res = await apiFetch(slug, `/api/v1/verses/current`, { revalidate: CACHE_CONTENT });
  return unwrap(res);
}

// ─── i18n (영어 자동번역) ─────────────────────────────────────

/** 문구 배열을 번역(캐시 우선, 서버). 실패 시 빈 맵 → 프론트는 원문 유지. */
export async function translateTexts(slug: string, texts: string[], lang: string): Promise<Record<string, string>> {
  if (!texts.length || lang === 'ko') return {};
  try {
    const res = await apiFetch<any>(slug, `/api/v1/i18n/translate`, {
      method: 'POST',
      body: JSON.stringify({ texts, lang }),
      revalidate: false,
    });
    return (res?.data?.translations ?? res?.translations ?? {}) as Record<string, string>;
  } catch {
    return {};
  }
}

// ─── Boards (게시판) ──────────────────────────────────────────

export async function getBoardBySlug(slug: string, boardSlug: string): Promise<any> {
  const res = await apiFetch(slug, `/api/v1/boards/${boardSlug}`, { revalidate: CACHE_CONTENT });
  return unwrap(res);
}

export async function getBoardPosts(
  slug: string,
  boardId: string,
  params?: { page?: number; perPage?: number },
): Promise<any> {
  const p = new URLSearchParams();
  if (params?.page) p.set('page', String(params.page));
  if (params?.perPage) p.set('perPage', String(params.perPage));
  const qs = p.toString();
  return apiFetch(slug, `/api/v1/boards/${boardId}/posts${qs ? '?' + qs : ''}`, { revalidate: CACHE_CONTENT });
}

// ─── Banners ─────────────────────────────────────────────────

export async function getBanners(slug: string): Promise<any[]> {
  const res = await apiFetch(slug, `/api/v1/banners?active=true`, { revalidate: CACHE_CONTENT });
  return unwrap(res) ?? [];
}
