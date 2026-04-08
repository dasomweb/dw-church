/**
 * WordPress REST API client for church site migration.
 * Auto-detects WP sites, fetches pages/posts/media/menus/categories with pagination.
 */

// ─── Types ────────────────────────────────────────────────

export interface WPPage {
  id: number;
  title: { rendered: string };
  slug: string;
  content: { rendered: string };
  excerpt: { rendered: string };
  featured_media: number;
  parent: number;
  menu_order: number;
  status: string;
}

export interface WPPost {
  id: number;
  title: { rendered: string };
  slug: string;
  content: { rendered: string };
  excerpt: { rendered: string };
  featured_media: number;
  date: string;
  categories: number[];
  tags: number[];
  status: string;
  _embedded?: Record<string, unknown>;
}

export interface WPMedia {
  id: number;
  source_url: string;
  title: { rendered: string };
  mime_type: string;
  media_details?: { sizes?: Record<string, { source_url: string }> };
}

export interface WPCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count: number;
}

export interface WPMenu {
  id: number;
  name: string;
  slug: string;
  items: WPMenuItem[];
}

export interface WPMenuItem {
  id: number;
  title: string;
  url: string;
  parent: number;
  menu_order: number;
  children?: WPMenuItem[];
}

export interface WPSiteData {
  siteName: string;
  siteUrl: string;
  apiUrl: string;
  pages: WPPage[];
  posts: WPPost[];
  media: WPMedia[];
  categories: WPCategory[];
  menus: WPMenu[];
}

// ─── Rate Limiter ─────────────────────────────────────────

// Max 2 requests/second as specified
let lastRequestTime = 0;
async function rateLimitedFetch(url: string, init?: RequestInit): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < 100) {
    await new Promise((resolve) => setTimeout(resolve, 100 - elapsed));
  }
  lastRequestTime = Date.now();
  return fetch(url, {
    ...init,
    headers: {
      'User-Agent': 'DWChurch-Migration/1.0',
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
    redirect: 'follow',
  });
}

// ─── Detection ────────────────────────────────────────────

export async function detectWordPress(
  siteUrl: string,
): Promise<{ isWordPress: boolean; apiUrl: string; siteName: string }> {
  // Strip /wp-json/... if user accidentally included it
  const normalizedUrl = siteUrl.replace(/\/wp-json.*$/i, '').replace(/\/+$/, '');

  // Try standard WP REST API endpoint
  const candidates = [
    `${normalizedUrl}/wp-json/wp/v2/`,
    `${normalizedUrl}/wp-json/`,
  ];

  for (const candidate of candidates) {
    try {
      const res = await rateLimitedFetch(candidate);
      if (res.ok) {
        const data = await res.json();
        // /wp-json/ returns site info with name and namespaces
        const siteName = (data as Record<string, unknown>).name as string ?? '';
        const apiUrl = `${normalizedUrl}/wp-json/wp/v2`;
        return { isWordPress: true, apiUrl, siteName };
      }
    } catch {
      // Not a WP site or network error — continue
    }
  }

  // Fallback: check for wp-content or wp-includes in HTML
  try {
    const res = await rateLimitedFetch(normalizedUrl);
    if (res.ok) {
      const html = await res.text();
      if (html.includes('/wp-content/') || html.includes('/wp-includes/')) {
        // Site uses WordPress but REST API may be disabled
        return {
          isWordPress: true,
          apiUrl: `${normalizedUrl}/wp-json/wp/v2`,
          siteName: '',
        };
      }
    }
  } catch {
    // Ignore
  }

  return { isWordPress: false, apiUrl: '', siteName: '' };
}

// ─── Paginated Fetch Helper ───────────────────────────────

async function fetchAllPaginated<T>(
  baseUrl: string,
  perPage = 100,
  maxItems = 1000,
): Promise<T[]> {
  const results: T[] = [];
  let page = 1;

  while (results.length < maxItems) {
    const separator = baseUrl.includes('?') ? '&' : '?';
    const url = `${baseUrl}${separator}per_page=${perPage}&page=${page}`;
    try {
      const res = await rateLimitedFetch(url);
      if (!res.ok) break;

      const data = (await res.json()) as T[];
      if (!Array.isArray(data) || data.length === 0) break;

      results.push(...data);

      // Check if there are more pages via X-WP-TotalPages header
      const totalPages = parseInt(res.headers.get('X-WP-TotalPages') ?? '1', 10);
      if (page >= totalPages) break;

      page++;
    } catch {
      break;
    }
  }

  return results;
}

// ─── Fetch Functions ──────────────────────────────────────

export async function fetchWPPages(apiUrl: string): Promise<WPPage[]> {
  // Fetch published pages, ordered by menu_order
  return fetchAllPaginated<WPPage>(`${apiUrl}/pages?status=publish&orderby=menu_order&order=asc`);
}

export async function fetchWPPosts(apiUrl: string, perPage = 100): Promise<WPPost[]> {
  // Fetch published posts with embedded data (featured image, categories)
  return fetchAllPaginated<WPPost>(
    `${apiUrl}/posts?status=publish&_embed=true`,
    perPage,
  );
}

export async function fetchWPMedia(apiUrl: string): Promise<WPMedia[]> {
  return fetchAllPaginated<WPMedia>(`${apiUrl}/media`);
}

export async function fetchWPCategories(apiUrl: string): Promise<WPCategory[]> {
  return fetchAllPaginated<WPCategory>(`${apiUrl}/categories`);
}

export async function fetchWPMenus(apiUrl: string): Promise<WPMenu[]> {
  // WP REST API v2 does not natively expose menus.
  // Try the popular wp-api-menus plugin endpoint or menus/v1.
  const menuEndpoints = [
    apiUrl.replace('/wp/v2', '/menus/v1/menus'),
    apiUrl.replace('/wp/v2', '/wp-api-menus/v2/menus'),
  ];

  for (const endpoint of menuEndpoints) {
    try {
      const res = await rateLimitedFetch(endpoint);
      if (!res.ok) continue;

      const menus = (await res.json()) as Record<string, unknown>[];
      if (!Array.isArray(menus)) continue;

      const result: WPMenu[] = [];
      for (const menu of menus) {
        const menuId = (menu.ID ?? menu.id ?? menu.term_id) as number;
        const menuName = (menu.name ?? menu.title ?? '') as string;
        const menuSlug = (menu.slug ?? '') as string;

        // Fetch items for this menu
        const items = await fetchMenuItems(endpoint, menuId);
        result.push({ id: menuId, name: menuName, slug: menuSlug, items });
      }
      return result;
    } catch {
      continue;
    }
  }

  return [];
}

async function fetchMenuItems(menuBaseUrl: string, menuId: number): Promise<WPMenuItem[]> {
  const itemEndpoints = [
    `${menuBaseUrl}/${menuId}`,
    `${menuBaseUrl}/${menuId}/items`,
  ];

  for (const endpoint of itemEndpoints) {
    try {
      const res = await rateLimitedFetch(endpoint);
      if (!res.ok) continue;

      const data = (await res.json()) as Record<string, unknown>;

      // Handle different response formats
      let rawItems: Record<string, unknown>[] = [];
      if (Array.isArray(data)) {
        rawItems = data;
      } else if (Array.isArray((data as Record<string, unknown>).items)) {
        rawItems = (data as Record<string, unknown>).items as Record<string, unknown>[];
      }

      return rawItems.map((item) => ({
        id: (item.ID ?? item.id ?? 0) as number,
        title: ((item.title as string) ?? (item.post_title as string) ?? '') as string,
        url: ((item.url as string) ?? '') as string,
        parent: ((item.menu_item_parent ?? item.parent ?? 0) as number),
        menu_order: ((item.menu_order ?? 0) as number),
      }));
    } catch {
      continue;
    }
  }

  return [];
}

export async function fetchWPCustomPostType(
  apiUrl: string,
  postType: string,
): Promise<WPPost[]> {
  // Custom post types are registered at /wp-json/wp/v2/{post_type}
  return fetchAllPaginated<WPPost>(`${apiUrl}/${postType}?status=publish&_embed=true`);
}

// ─── Full Site Fetch ──────────────────────────────────────

export async function fetchWPSiteData(siteUrl: string): Promise<WPSiteData | null> {
  const detection = await detectWordPress(siteUrl);
  if (!detection.isWordPress) return null;

  const { apiUrl, siteName } = detection;

  // Fetch all data types. Each fetch handles its own errors gracefully.
  const [pages, posts, categories, menus] = await Promise.all([
    fetchWPPages(apiUrl).catch(() => [] as WPPage[]),
    fetchWPPosts(apiUrl).catch(() => [] as WPPost[]),
    fetchWPCategories(apiUrl).catch(() => [] as WPCategory[]),
    fetchWPMenus(apiUrl).catch(() => [] as WPMenu[]),
  ]);
  // Skip media fetch (slow, not critical for migration)
  const media: WPMedia[] = [];

  // Try common custom post types in parallel
  const customTypes = ['sermon', 'sermons', 'staff', 'event', 'events'];
  const cptResults = await Promise.all(
    customTypes.map((cpt) =>
      fetchWPCustomPostType(apiUrl, cpt)
        .then((posts) => posts.map((p) => ({ ...p, _customPostType: cpt } as WPPost)))
        .catch(() => [] as WPPost[])
    )
  );
  const customPosts = cptResults.flat();

  return {
    siteName,
    siteUrl: siteUrl.replace(/\/+$/, ''),
    apiUrl,
    pages,
    posts: [...posts, ...customPosts],
    media,
    categories,
    menus,
  };
}
