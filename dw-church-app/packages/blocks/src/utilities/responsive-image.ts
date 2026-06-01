/**
 * Responsive image helpers.
 *
 * We don't (yet) generate multiple physical resolutions per upload —
 * the AI image pipeline produces a single asset and R2 stores it as
 * one object. Real multi-resolution `srcset` therefore needs an
 * edge transform (Cloudflare Image Resizing on the R2 origin, or a
 * dedicated image CDN) which is provisioned per-environment.
 *
 * What this module DOES today:
 *   - Provide `imageSizesFor(slot)` — `<img sizes>` hint per slot type.
 *     The browser uses it to pick the right resource if a srcset
 *     becomes available, and to size the cache hit correctly.
 *   - Provide `srcSetFor(url)` — currently returns `undefined` when no
 *     transform endpoint is configured. When the CDN is enabled it
 *     emits `url?width=400 400w, url?width=800 800w, ...` form. Block
 *     components spread its return value into the `<img>` so adding
 *     CDN support later is a single-file change here, not a sweep
 *     across every block.
 *
 * Why intrinsic width/height matter even at one resolution:
 *   Setting `width`/`height` attributes lets the browser reserve
 *   layout space before the image loads → no CLS jump as the hero /
 *   gallery card flips from gray box to real photo.
 */

export type ImageSlot =
  | 'hero-bg'        // full-bleed background, 1 viewport wide
  | 'hero-bg-mobile' // 9:16 portrait for ≤767px viewport
  | 'split-side'     // half-width on desktop, full on mobile
  | 'card-grid'      // 1 / 2 / 3 / 4 columns depending on bp
  | 'avatar'         // small circle, fixed size
  | 'gallery';       // grid item, similar to card-grid

/**
 * `sizes` attribute string telling the browser which physical width
 * the image will render at across breakpoints. Values mirror the
 * Tailwind `md:`/`lg:`/`xl:` thresholds the blocks already pivot on.
 */
export function imageSizesFor(slot: ImageSlot): string {
  switch (slot) {
    case 'hero-bg':
    case 'hero-bg-mobile':
      // full viewport width on every breakpoint
      return '100vw';
    case 'split-side':
      // mobile: full width. md+ : ~50% of an 1280px container, capped
      // so the browser doesn't fetch a 4k asset for a 640px slot.
      return '(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 640px';
    case 'card-grid':
    case 'gallery':
      // mobile 1col → sm 2col → lg 3-4col. 1280px container / 4 = 320px ceiling.
      return '(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 320px';
    case 'avatar':
      return '96px';
    default:
      return '100vw';
  }
}

/**
 * Intrinsic dimensions to set as `width` / `height` attributes for CLS
 * prevention. These don't dictate the rendered size (CSS controls
 * that) — they tell the browser the aspect ratio so it reserves
 * layout space before the bitmap arrives.
 */
export function intrinsicSize(slot: ImageSlot): { width: number; height: number } {
  switch (slot) {
    case 'hero-bg':         return { width: 1920, height: 1080 };
    case 'hero-bg-mobile':  return { width: 1080, height: 1920 };
    case 'split-side':      return { width: 1280, height: 960 };  // 4:3
    case 'card-grid':       return { width: 1280, height: 960 };  // 4:3
    case 'gallery':         return { width: 1280, height: 853 };  // 3:2
    case 'avatar':          return { width: 192, height: 192 };
  }
}

/**
 * Generate a `srcset` for a URL when an image-transform CDN is wired
 * to the build. Returns `undefined` when no transform endpoint is
 * configured — the `<img src>` original-URL fetch is still correct,
 * just without multi-resolution selection.
 *
 * Enable by setting `VITE_IMAGE_TRANSFORM_TEMPLATE` to a template like:
 *   `{origin}/cdn-cgi/image/width={w},format=auto{path}`
 * — at runtime we replace `{origin}` + `{path}` + `{w}` so it works
 * with the existing R2 URLs without rewriting them at upload time.
 */
const TRANSFORM_TEMPLATE: string | undefined =
  typeof process !== 'undefined' && process.env
    ? (process.env.VITE_IMAGE_TRANSFORM_TEMPLATE
        ?? process.env.NEXT_PUBLIC_IMAGE_TRANSFORM_TEMPLATE
        ?? undefined)
    : undefined;

const DEFAULT_WIDTHS = [400, 640, 800, 1280, 1920];

export function srcSetFor(
  url: string | undefined,
  widths: number[] = DEFAULT_WIDTHS,
): string | undefined {
  if (!url || !TRANSFORM_TEMPLATE) return undefined;
  try {
    const parsed = new URL(url);
    const origin = `${parsed.protocol}//${parsed.host}`;
    const path = parsed.pathname + parsed.search;
    return widths
      .map((w) => {
        const transformed = TRANSFORM_TEMPLATE
          .replace('{origin}', origin)
          .replace('{path}', path)
          .replace('{w}', String(w));
        return `${transformed} ${w}w`;
      })
      .join(', ');
  } catch {
    return undefined;
  }
}

/**
 * One-stop helper — returns the bundle of attrs to spread onto an
 * `<img>` for a given slot. Block components write:
 *
 *   <img src={url} alt={alt} {...imgAttrs('card-grid', url)} />
 */
export function imgAttrs(
  slot: ImageSlot,
  url: string | undefined,
): {
  sizes: string;
  srcSet?: string;
  width: number;
  height: number;
  loading: 'lazy' | 'eager';
  decoding: 'async';
} {
  const { width, height } = intrinsicSize(slot);
  const srcSet = srcSetFor(url);
  return {
    sizes: imageSizesFor(slot),
    ...(srcSet ? { srcSet } : {}),
    width,
    height,
    loading: slot === 'hero-bg' || slot === 'hero-bg-mobile' ? 'eager' : 'lazy',
    decoding: 'async',
  };
}
