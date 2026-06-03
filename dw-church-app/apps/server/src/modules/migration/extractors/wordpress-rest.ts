/**
 * WordPress REST API Extractor — Phase 12-γ.3 (2026-06-03).
 *
 * When platform-detector says wordpress, we try the REST API directly.
 * It returns structured posts + categories + media without the guesswork
 * of HTML scraping. Most WordPress installs expose /wp-json/wp/v2/* by
 * default; some lock it down — in that case we silently fall back to
 * the HTML scraper's output (this module returns null).
 *
 * See [[project_migration_wp_rest_kboard]] for the test-case (라그란지
 * 한인침례교회) that motivated this path.
 */

import type { RawWpPost, RawKBoardRow } from '../types.js';

const USER_AGENT = 'TrueLight-Migration/2.0';
const PER_PAGE = 100;
const TIMEOUT_MS = 15_000;

interface WpRestResult {
  posts: RawWpPost[];
  kboardRows: RawKBoardRow[];
}

/**
 * Main entry point. Returns null if WP REST is not accessible (404,
 * 401, network error, malformed JSON). Caller falls back to HTML scrape.
 */
export async function extractFromWordPressRest(
  baseUrl: string,
): Promise<WpRestResult | null> {
  const origin = new URL(baseUrl).origin;

  // Probe — if /wp-json/ doesn't respond with JSON, abort silently.
  const ok = await probe(`${origin}/wp-json/`);
  if (!ok) return null;

  // Fetch categories + media + tags first — small, used to resolve
  // posts in one pass.
  const [categoriesMap, mediaMap, tagsMap, usersMap] = await Promise.all([
    fetchMap(`${origin}/wp-json/wp/v2/categories?per_page=${PER_PAGE}`, (c: WpCategory) => [c.id, c.name]),
    fetchMap(`${origin}/wp-json/wp/v2/media?per_page=${PER_PAGE}`, (m: WpMedia) => [m.id, m.source_url]),
    fetchMap(`${origin}/wp-json/wp/v2/tags?per_page=${PER_PAGE}`, (t: WpTag) => [t.id, t.name]),
    fetchMap(`${origin}/wp-json/wp/v2/users?per_page=${PER_PAGE}`, (u: WpUser) => [u.id, u.name]),
  ]);

  // Fetch posts + pages. Walk pagination until empty or 5 pages (500 posts).
  const posts = await fetchAllPaginated<WpPostRaw>(
    `${origin}/wp-json/wp/v2/posts?per_page=${PER_PAGE}`,
    5,
  );
  const pages = await fetchAllPaginated<WpPostRaw>(
    `${origin}/wp-json/wp/v2/pages?per_page=${PER_PAGE}`,
    5,
  );

  const allRaw = [
    ...posts.map((p) => ({ ...p, _type: 'post' as const })),
    ...pages.map((p) => ({ ...p, _type: 'page' as const })),
  ];

  const result: RawWpPost[] = allRaw.map((p) => {
    const contentHtml = p.content?.rendered ?? '';
    const contentText = htmlToText(contentHtml);
    return {
      id: p.id,
      postType: p._type,
      slug: p.slug ?? '',
      title: htmlToText(p.title?.rendered ?? ''),
      contentHtml,
      contentText,
      excerpt: htmlToText(p.excerpt?.rendered ?? ''),
      date: p.date ?? '',
      link: p.link ?? '',
      categories: (p.categories ?? []).map((id) => (categoriesMap.get(id) ?? '').toLowerCase()).filter(Boolean),
      tags: (p.tags ?? []).map((id) => tagsMap.get(id) ?? '').filter(Boolean),
      featuredImage: mediaMap.get(p.featured_media) ?? '',
      bodyImages: extractImageUrls(contentHtml),
      attachments: extractAttachmentUrls(contentHtml),
      author: usersMap.get(p.author) ?? '',
    };
  });

  // KBoard rows — for each page whose body contains a [kboard_list]
  // shortcode signature, scrape the rendered page HTML.
  const kboardRows: RawKBoardRow[] = [];
  const kboardCandidates = result.filter((p) =>
    /\[kboard_list|kboard-list|board_name=/i.test(p.contentHtml) ||
    /\[kboard_list|kboard-list|board_name=/i.test(p.contentText)
  );
  for (const candidate of kboardCandidates) {
    if (kboardRows.length > 300) break; // safety cap
    try {
      const rows = await scrapeKBoardPage(candidate.link, candidate.title);
      kboardRows.push(...rows);
    } catch {
      // silently skip
    }
  }

  return { posts: result, kboardRows };
}

// ─── REST helpers ───────────────────────────────────────────

interface WpPostRaw {
  id: number;
  date: string;
  slug: string;
  link: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  author: number;
  featured_media: number;
  categories: number[];
  tags: number[];
}
interface WpCategory { id: number; name: string; }
interface WpMedia { id: number; source_url: string; }
interface WpTag { id: number; name: string; }
interface WpUser { id: number; name: string; }

async function probe(url: string): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(url, TIMEOUT_MS);
    if (!res.ok) return false;
    const ct = res.headers.get('content-type') ?? '';
    if (!/json/i.test(ct)) return false;
    const body = await res.json().catch(() => null);
    // Real WP root index has `name`, `routes`. If missing → some plugin
    // intercepted the route — treat as unavailable.
    return body && typeof body === 'object' && 'routes' in body;
  } catch {
    return false;
  }
}

async function fetchMap<T, K extends number | string, V>(
  url: string,
  pick: (item: T) => [K, V],
): Promise<Map<K, V>> {
  const out = new Map<K, V>();
  try {
    const items = await fetchAllPaginated<T>(url, 3);
    for (const item of items) {
      const [k, v] = pick(item);
      out.set(k, v);
    }
  } catch {
    // empty map on failure
  }
  return out;
}

async function fetchAllPaginated<T>(baseUrl: string, maxPages: number): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const sep = baseUrl.includes('?') ? '&' : '?';
    const url = `${baseUrl}${sep}page=${page}`;
    try {
      const res = await fetchWithTimeout(url, TIMEOUT_MS);
      if (!res.ok) break;
      const body = await res.json() as T[];
      if (!Array.isArray(body) || body.length === 0) break;
      out.push(...body);
      if (body.length < PER_PAGE) break;
    } catch {
      break;
    }
  }
  return out;
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      redirect: 'follow',
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

// ─── HTML helpers ───────────────────────────────────────────

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractImageUrls(html: string): string[] {
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const src = m[1] ?? '';
    if (src && !src.startsWith('data:')) out.push(src);
  }
  return out;
}

function extractAttachmentUrls(html: string): string[] {
  const re = /<a[^>]+href=["']([^"']+\.(?:pdf|hwp|hwpx|docx?|pptx?|xlsx?))["']/gi;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (m[1]) out.push(m[1]);
  }
  return out;
}

// ─── KBoard page scrape ────────────────────────────────────

async function scrapeKBoardPage(pageUrl: string, hostTitle: string): Promise<RawKBoardRow[]> {
  const rows: RawKBoardRow[] = [];

  // KBoard usually paginates via ?pageNum=N. Walk up to 5 pages.
  for (let p = 1; p <= 5; p++) {
    const u = new URL(pageUrl);
    u.searchParams.set('pageNum', String(p));
    const res = await fetchWithTimeout(u.toString(), TIMEOUT_MS).catch(() => null);
    if (!res || !res.ok) break;
    const html = await res.text().catch(() => '');
    const tableMatch = html.match(/<table[^>]*class=["'][^"']*kboard-list[^"']*["'][\s\S]*?<\/table>/i)
      ?? html.match(/<div[^>]*class=["'][^"']*kboard-list[^"']*["'][\s\S]*?<\/div>/i);
    if (!tableMatch) break;
    const table = tableMatch[0];

    // Pull rows — each <tr> with a kboard-list-cell or a <td> containing
    // an <a href="?mod=document">. Conservative: just walk <a> inside
    // kboard-list with mod=document.
    const rowRegex = /<a[^>]+href=["']([^"']*mod=document[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
    const boardNameMatch = /board_name=([^&"'\s]+)/i.exec(table)
      ?? /board_name=([^&"'\s]+)/i.exec(pageUrl);
    const boardSlug = (boardNameMatch?.[1] ?? slugify(hostTitle)).toLowerCase();
    const before = rows.length;
    let m: RegExpExecArray | null;
    while ((m = rowRegex.exec(table)) !== null) {
      const detailUrl = absolutize(pageUrl, m[1] ?? '');
      const title = htmlToText(m[2] ?? '');
      if (!title || title.length > 200) continue;
      // Date hint: KBoard rows often render date in a sibling <td> near
      // the <a>. Search ±200 chars window.
      const idx = table.indexOf(m[0]);
      const win = table.slice(Math.max(0, idx - 200), idx + (m[0]?.length ?? 0) + 200);
      const dateMatch = win.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
      const date = dateMatch
        ? `${dateMatch[1]}-${(dateMatch[2] ?? '').padStart(2, '0')}-${(dateMatch[3] ?? '').padStart(2, '0')}`
        : '';
      const authorMatch = win.match(/class=["'][^"']*kboard-list-user[^"']*["'][^>]*>([\s\S]*?)<\//i);
      const author = authorMatch ? htmlToText(authorMatch[1] ?? '') : '';
      rows.push({ boardSlug, boardTitle: hostTitle, title, detailUrl, date, author });
    }
    // If this page added nothing, we're past the last page.
    if (rows.length === before) break;
  }

  // Best-effort PDF sniff for bulletin boards (gated on small row count
  // so we don't spam dozens of detail fetches on a busy notice board).
  const bulletinish = /jubo|bulletin|주보/i.test(rows[0]?.boardSlug ?? '');
  if (bulletinish && rows.length <= 30) {
    for (const r of rows) {
      try {
        const res = await fetchWithTimeout(r.detailUrl, TIMEOUT_MS);
        if (!res.ok) continue;
        const html = await res.text();
        const pdf = /<a[^>]+href=["']([^"']+\.pdf)["']/i.exec(html);
        if (pdf?.[1]) r.pdfUrl = absolutize(r.detailUrl, pdf[1]);
      } catch { /* skip */ }
    }
  }

  return rows;
}

function absolutize(base: string, href: string): string {
  try { return new URL(href, base).href; } catch { return href; }
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'board';
}
