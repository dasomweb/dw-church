/**
 * Placeholder image generator for AI builds.
 *
 * Two-tier resolution:
 *
 *   1. Unsplash search (when env UNSPLASH_ACCESS_KEY is set)
 *      Photos relevant to the actual page/section content. Caller
 *      derives a `keyword` from business industry + page name +
 *      section title and runs `prefetchUnsplash(queries)` once per
 *      page so subsequent sync `fillImage()` calls hit the in-memory
 *      cache. Network calls are batched and parallel.
 *
 *   2. Picsum (default fallback)
 *      Seed-based stable photos at https://picsum.photos. No API key
 *      required, but not keyword-aware. Used when Unsplash isn't
 *      configured, the search returns nothing, or the network fails.
 *
 * Seeds for Picsum derive from (tenantSlug, pageSlug, sortOrder, role)
 * so the same build produces the same images across server restarts.
 */

// crypto import dropped along with the picsum-seed hash.

export type ImageRole = 'hero-bg' | 'hero-side' | 'section' | 'card';

const SIZE_BY_ROLE: Record<ImageRole, [number, number]> = {
  'hero-bg':   [1920, 1080], // image-overlay / page-hero / cover
  'hero-side': [1200, 900],  // split-image side image
  section:     [1200, 800],  // text_image / image_text body sections
  card:        [800, 600],   // grid items, gallery placeholders
};

interface PlaceholderArgs {
  tenantSlug: string;
  pageSlug: string;
  sortOrder: number;
  role: ImageRole;
  /** Search query for Unsplash. Picsum mode ignores this. */
  keyword?: string;
  /**
   * For multi-image slots (gallery). When `keyword` resolves to a list
   * of N Unsplash results, this index picks which result to use so
   * adjacent gallery cards don't repeat. Defaults to sortOrder.
   */
  imageIndex?: number;
}

/* ──────────────────────────────────────────────────────────────
 * Unsplash cache layer
 * ──────────────────────────────────────────────────────────────*/

/** Per-process LRU-ish cache keyed by normalized query. */
const unsplashCache = new Map<string, string[]>();
const inflight = new Map<string, Promise<string[]>>();

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 80);
}

async function fetchUnsplashSearch(query: string): Promise<string[]> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return [];

  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=10&orientation=landscape&content_filter=high`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${key}` },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: Array<{ urls?: { regular?: string; raw?: string } }> };
    const urls = (json.results ?? [])
      .map((r) => r.urls?.raw ?? r.urls?.regular ?? '')
      .filter((s): s is string => !!s);
    return urls;
  } catch {
    return [];
  }
}

/**
 * Pre-warm the Unsplash cache for the given queries. Caller batches
 * every keyword used by an AI build into a single Promise.all so
 * downstream sync `fillImage()` calls can hit the cache without
 * blocking the build flow per-section.
 *
 * No-op when UNSPLASH_ACCESS_KEY is missing (Picsum will be used).
 * Errors per query are silently absorbed — the caller falls back to
 * Picsum cleanly when a query has no cached results.
 */
export async function prefetchUnsplash(queries: string[]): Promise<void> {
  if (!process.env.UNSPLASH_ACCESS_KEY) return;
  const unique = Array.from(new Set(queries.map(normalizeQuery).filter(Boolean)));
  await Promise.all(
    unique.map(async (q) => {
      if (unsplashCache.has(q)) return;
      let pending = inflight.get(q);
      if (!pending) {
        pending = fetchUnsplashSearch(q);
        inflight.set(q, pending);
      }
      try {
        const urls = await pending;
        unsplashCache.set(q, urls);
      } finally {
        inflight.delete(q);
      }
    }),
  );
}

/**
 * Return a sized URL from the Unsplash cache, or null if no hit.
 * Unsplash 'raw' URLs accept w/h/fit query params for on-the-fly
 * resizing, so we can serve any role's dimensions from one cache entry.
 */
function unsplashFromCache(args: PlaceholderArgs): string | null {
  if (!args.keyword) return null;
  const q = normalizeQuery(args.keyword);
  const urls = unsplashCache.get(q);
  if (!urls || urls.length === 0) return null;

  const idx = (args.imageIndex ?? args.sortOrder) % urls.length;
  const base = urls[idx]!;
  const [w, h] = SIZE_BY_ROLE[args.role];
  // Imgix-style resize params; Unsplash CDN respects w/h/fit/q/auto.
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}w=${w}&h=${h}&fit=crop&crop=entropy&q=80&auto=format`;
}

/* Picsum fallback REMOVED — generated random landscape photos with no
 * relation to the business (orchid wholesaler getting buildings/people),
 * which the operator legitimately called out as fake content masquerading
 * as AI output. With the operator's "no paid Unsplash" decision, blocks
 * now degrade to brand-color gradients when no image is available. */

/* ──────────────────────────────────────────────────────────────
 * Public API
 * ──────────────────────────────────────────────────────────────*/

/**
 * Return a placeholder URL for the given context.
 *
 * Strategy (after the operator vetoed paid Unsplash):
 *   - When UNSPLASH_ACCESS_KEY IS set, use Unsplash search (real
 *     keyword-relevant photos).
 *   - When NOT set: return empty string. The previous behavior fell
 *     through to picsum.photos, which delivered random landscape
 *     photos with no relation to the business — orchid wholesaler
 *     getting random buildings/people/landscapes. Block renderers
 *     have brand-color gradient fallbacks for missing images, so an
 *     empty string degrades cleanly. Operator uploads real images
 *     via the builder afterwards.
 */
export function placeholderImage(args: PlaceholderArgs): string {
  const fromUnsplash = unsplashFromCache(args);
  if (fromUnsplash) return fromUnsplash;
  // No Unsplash → no image. Block renderers handle empty imageUrl
  // by rendering a brand-gradient placeholder (see HeroBannerBlock,
  // FeaturesGridBlock image-card variant, etc).
  return '';
}

/**
 * Keep an existing image URL when present; otherwise return whatever
 * placeholderImage emits (an Unsplash URL when configured, empty
 * string otherwise so the block falls back to its brand-gradient).
 */
export function fillImage(
  existing: string | null | undefined,
  args: PlaceholderArgs,
): string {
  if (existing && existing.trim()) return existing;
  return placeholderImage(args);
}

/**
 * Whether placeholder image generation is configured. False means
 * `placeholderImage` will return empty strings — useful for the build
 * route to surface a "no images generated" warning so the operator
 * knows to upload images via the builder rather than wondering why
 * the storefront renders gradient blocks.
 */
export function placeholdersAvailable(): boolean {
  return Boolean(process.env.UNSPLASH_ACCESS_KEY);
}
