/**
 * WordPress REST bulk collector — deterministic (non-LLM) extraction of ALL
 * posts from a WordPress source via /wp-json/wp/v2/*, paginated to completion,
 * then mapped into our Content Module arrays (주보·설교·앨범·칼럼·행사·게시판).
 *
 * Why this exists (STEP 2 of the migration redesign): the agent's tool-use loop
 * can only summarise ~30 items per call and has a hard turn cap, so it never
 * pulled a real site's full post archive — migrations looked "완료" with almost
 * nothing applied. WP REST is deterministic, paginates the WHOLE archive, and
 * commonly answers even when the front-end HTML is WAF-blocked (the JSON API
 * sits on a different path most challenge rules don't cover). So this is the
 * reliable "대량 수집" path that makes a WordPress migration actually substantial.
 *
 * Category → module mapping is heuristic (Korean church category names vary),
 * but a review step runs AFTER this, so an imperfect guess is corrected by the
 * operator — never silently wrong. Unrecognised categories become a board
 * (which is exactly what a generic WP category archive is).
 *
 * Idempotent: every mapped item carries its source permalink as sourceUrl, so a
 * re-import UPDATEs the same row instead of duplicating (see appliers/posts.ts).
 */

import { env } from '../../../config/env.js';
import type {
  ClassifiedBulletin, ClassifiedSermon, ClassifiedAlbum, ClassifiedColumn,
  ClassifiedEvent, ClassifiedBoard,
} from '../types.js';

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const PROXY_ENDPOINT = 'https://api.truelight.app/__migration_proxy';

const PER_PAGE = 50;          // _embed makes each item heavy — 50 balances size vs round-trips
const MAX_PAGES = 40;         // hard cap → at most 2000 posts pulled
const REQ_TIMEOUT_MS = 20_000;

/** The module arrays a WordPress archive maps to, plus every image URL seen and
 *  a count of posts processed (for honest reporting). */
export interface WpModules {
  isWordPress: boolean;
  postCount: number;
  bulletins: ClassifiedBulletin[];
  sermons: ClassifiedSermon[];
  albums: ClassifiedAlbum[];
  columns: ClassifiedColumn[];
  events: ClassifiedEvent[];
  boards: ClassifiedBoard[];
  images: string[];
}

function emptyWpModules(isWordPress = false): WpModules {
  return { isWordPress, postCount: 0, bulletins: [], sermons: [], albums: [], columns: [], events: [], boards: [], images: [] };
}

/** Fetch through the Cloudflare Worker proxy when SAAS_PROXY_SECRET is set (its
 *  IPs bypass the WAFs that block Railway), else direct with browser headers. */
async function wpFetch(targetUrl: string, signal: AbortSignal): Promise<Response> {
  const secret = env.SAAS_PROXY_SECRET;
  if (secret) {
    return await fetch(`${PROXY_ENDPOINT}?url=${encodeURIComponent(targetUrl)}`, {
      signal,
      headers: { 'X-Tenant-Verify': secret, Accept: 'application/json' },
    });
  }
  return await fetch(targetUrl, {
    signal,
    headers: {
      'User-Agent': BROWSER_UA,
      Accept: 'application/json,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
    },
  });
}

async function wpGet<T>(url: string): Promise<{ ok: boolean; status: number; json: T | null; totalPages: number }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQ_TIMEOUT_MS);
  try {
    const res = await wpFetch(url, ctrl.signal);
    const totalPages = Number(res.headers.get('x-wp-totalpages') ?? '0') || 0;
    if (!res.ok) return { ok: false, status: res.status, json: null, totalPages };
    const ct = res.headers.get('content-type') ?? '';
    if (!/json/i.test(ct)) return { ok: false, status: res.status, json: null, totalPages };
    return { ok: true, status: res.status, json: (await res.json()) as T, totalPages };
  } catch {
    return { ok: false, status: 0, json: null, totalPages: 0 };
  } finally {
    clearTimeout(timer);
  }
}

const restBase = (baseUrl: string) => `${baseUrl.replace(/\/$/, '')}/wp-json/wp/v2`;

/** Is this a WordPress site with a reachable REST API? Checks /wp-json/. */
export async function detectWordPress(baseUrl: string): Promise<boolean> {
  const root = `${baseUrl.replace(/\/$/, '')}/wp-json/`;
  const { ok, json } = await wpGet<{ namespaces?: string[] }>(root);
  if (ok && json && Array.isArray(json.namespaces)) return json.namespaces.includes('wp/v2');
  // Fallback: a 1-item posts probe (some installs hide the discovery root).
  const probe = await wpGet<unknown[]>(`${restBase(baseUrl)}/posts?per_page=1`);
  return probe.ok && Array.isArray(probe.json);
}

// ─── WP REST entity shape (only the fields we read) ─────────

interface WpTerm { taxonomy?: string; name?: string; slug?: string }
export interface WpPost {
  id: number;
  date?: string;
  link?: string;
  title?: { rendered?: string };
  content?: { rendered?: string };
  _embedded?: {
    'wp:featuredmedia'?: { source_url?: string }[];
    'wp:term'?: WpTerm[][];
  };
}

/**
 * Collect the FULL post archive (paginated) and map it into module arrays.
 * Returns { isWordPress:false } untouched if the site isn't WordPress or the
 * REST API is blocked — the caller then relies on the agent crawl alone.
 */
export async function collectWpModules(
  baseUrl: string,
  onProgress?: (msg: string) => void,
): Promise<WpModules> {
  const isWp = await detectWordPress(baseUrl);
  if (!isWp) {
    onProgress?.('wp-rest: not a WordPress REST source (skipping bulk collection)');
    return emptyWpModules(false);
  }

  const posts: WpPost[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const url = `${restBase(baseUrl)}/posts?per_page=${PER_PAGE}&page=${page}&_embed=wp:featuredmedia,wp:term&orderby=date&order=desc`;
    const { ok, status, json, totalPages: tp } = await wpGet<WpPost[]>(url);
    if (!ok || !Array.isArray(json)) {
      onProgress?.(`wp-rest: posts page ${page} failed (status=${status}) — stopping pagination`);
      break;
    }
    posts.push(...json);
    if (page === 1) totalPages = Math.min(tp || 1, MAX_PAGES);
    onProgress?.(`wp-rest: posts page ${page}/${totalPages} (+${json.length}, total ${posts.length})`);
    if (json.length < PER_PAGE) break;
    page++;
  } while (page <= totalPages && page <= MAX_PAGES);

  const mapped = mapPostsToModules(posts);
  onProgress?.(
    `wp-rest: mapped ${posts.length} posts → 주보 ${mapped.bulletins.length}, 설교 ${mapped.sermons.length}, ` +
    `앨범 ${mapped.albums.length}, 칼럼 ${mapped.columns.length}, 행사 ${mapped.events.length}, ` +
    `게시판 ${mapped.boards.length}개(${mapped.boards.reduce((s, b) => s + b.posts.length, 0)}글), 이미지 ${mapped.images.length}`,
  );
  return { ...mapped, isWordPress: true, postCount: posts.length };
}

// ─── Mapping ────────────────────────────────────────────────

/** Route a category/tag name to a Content Module, or null → generic board. */
function categoryToModule(name: string): 'bulletins' | 'sermons' | 'albums' | 'columns' | 'events' | null {
  if (/주보|주간|weekly|bulletin/i.test(name)) return 'bulletins';
  if (/설교|말씀|sermon|message|예배|주일예배/i.test(name)) return 'sermons';
  if (/앨범|갤러리|사진|포토|gallery|photo|album/i.test(name)) return 'albums';
  if (/칼럼|묵상|목회|column|devotion|qt/i.test(name)) return 'columns';
  if (/행사|공지|소식|이벤트|안내|event|news|notice|announce/i.test(name)) return 'events';
  return null;
}

/** Exported for unit testing — routes each WP post to a Content Module (or a
 *  board) by its primary category, extracting date/images/youtube/pdf. */
export function mapPostsToModules(posts: WpPost[]): Omit<WpModules, 'isWordPress' | 'postCount'> {
  const bulletins: ClassifiedBulletin[] = [];
  const sermons: ClassifiedSermon[] = [];
  const albums: ClassifiedAlbum[] = [];
  const columns: ClassifiedColumn[] = [];
  const events: ClassifiedEvent[] = [];
  const boardMap = new Map<string, ClassifiedBoard>();
  const imageSet = new Set<string>();

  for (const p of posts) {
    const title = htmlToText(p.title?.rendered ?? '').slice(0, 300);
    const html = p.content?.rendered ?? '';
    const date = (p.date ?? '').slice(0, 10);           // WP `date` is ISO → YYYY-MM-DD
    const sourceUrl = p.link ?? '';
    const featured = p._embedded?.['wp:featuredmedia']?.[0]?.source_url ?? '';
    const imgs = extractImages(html);
    if (featured) imgs.unshift(featured);
    for (const u of imgs) imageSet.add(u);
    const youtubeUrl = extractYoutube(html);

    const cats = (p._embedded?.['wp:term'] ?? []).flat().filter((t) => t?.taxonomy === 'category');
    const primary = cats.find((c) => c.name && !/uncategor/i.test(c.name)) ?? cats[0];
    const module = primary?.name ? categoryToModule(primary.name) : null;

    switch (module) {
      case 'bulletins':
        bulletins.push({ title, date, pdfUrl: extractPdf(html), images: imgs, sourceUrl });
        break;
      case 'sermons':
        sermons.push({ title, scripture: '', preacher: '', date, youtubeUrl, thumbnailUrl: featured, sourceUrl });
        break;
      case 'albums':
        albums.push({ title, images: imgs, youtubeUrl, date, sourceUrl });
        break;
      case 'columns':
        columns.push({ title, content: htmlToText(html), topImageUrl: featured, youtubeUrl, date, sourceUrl });
        break;
      case 'events':
        events.push({ title, description: htmlToText(html), date, location: '', imageUrl: featured, sourceUrl });
        break;
      default: {
        // Unrecognised category → a board named after it (a generic WP archive).
        const slug = (primary?.slug || 'notice').toLowerCase().replace(/[^a-z0-9가-힣_-]/gi, '-').slice(0, 40) || 'notice';
        const boardTitle = primary?.name || '게시판';
        let board = boardMap.get(slug);
        if (!board) { board = { boardSlug: slug, boardTitle, posts: [] }; boardMap.set(slug, board); }
        board.posts.push({ title, content: htmlToText(html), author: '', date });
      }
    }
  }

  return {
    bulletins, sermons, albums, columns, events,
    boards: [...boardMap.values()],
    images: [...imageSet],
  };
}

// ─── HTML → data helpers (WP content.rendered is HTML) ──────

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#039;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function extractImages(html: string): string[] {
  const set = new Set<string>();
  const ok = (u: string) => u && !u.startsWith('data:') && !/\.svg(\?|$)/i.test(u);
  let m: RegExpExecArray | null;
  const srcRe = /<img[^>]+(?:data-src|data-lazy-src|src)\s*=\s*["']([^"']+)["']/gi;
  while ((m = srcRe.exec(html)) !== null) { const u = (m[1] ?? '').trim(); if (ok(u)) set.add(u); }
  const srcsetRe = /srcset\s*=\s*["']([^"']+)["']/gi;
  while ((m = srcsetRe.exec(html)) !== null) {
    const first = (m[1] ?? '').split(',')[0]?.trim().split(/\s+/)[0];
    if (first && ok(first)) set.add(first);
  }
  return [...set];
}

function extractYoutube(html: string): string {
  const m = html.match(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([A-Za-z0-9_-]{11})/i);
  return m ? `https://www.youtube.com/watch?v=${m[1]}` : '';
}

function extractPdf(html: string): string {
  const m = html.match(/href\s*=\s*["']([^"']+\.pdf[^"']*)["']/i);
  return m ? (m[1] ?? '') : '';
}
