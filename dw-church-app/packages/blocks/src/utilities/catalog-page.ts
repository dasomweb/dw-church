/**
 * Shared chrome for "print-style" catalog pages.
 *
 * Every block in the catalog magazine family (cover / toc / product
 * page / back cover) renders inside the same A5 landscape "spread"
 * shell so the operator's catalog reads like a physical book: fixed
 * aspect ratio, consistent margins, running header/footer slot.
 *
 * Aspect: A5 landscape is 210×148mm (≈ 1.4189). We use `aspect-ratio:
 * 210 / 148` so the spread scales to the available width and the
 * height auto-derives, which is what scroll-snap navigation expects.
 */

export const CATALOG_SPREAD_ASPECT = '210 / 148';

/** Outer container class for an A5 spread. Paper color and border color
 *  are supplied per starter via inline style so each design owns its own
 *  paper feel. Pair with `style={{ aspectRatio, background, borderColor }}`. */
export const CATALOG_SPREAD_CLASS =
  'relative w-full max-w-5xl mx-auto shadow-[0_2px_24px_-4px_rgba(0,0,0,0.08)] border overflow-hidden';

/** Default inner padding fallback (overridden per starter via visuals.spreadPad). */
export const CATALOG_SPREAD_PAD = 'p-8 sm:p-12';
