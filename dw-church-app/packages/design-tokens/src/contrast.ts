/**
 * WCAG AA-aware foreground pairing.
 *
 * Phase 4: 4.5:1 contrast-ratio solver. For each background slot we
 * try candidates in priority order — the operator-set `text` /
 * `background` / `surface` colors first, then white / near-black /
 * mid-grey fallbacks — and pick the first that passes WCAG AA for
 * normal-size text (4.5:1). If nothing passes, fall back to whichever
 * candidate gives the highest ratio so we degrade gracefully instead
 * of crashing.
 *
 * Used by `to-css-vars.ts` to emit `--brand-{slot}-fg` alongside every
 * color slot. Block CTAs reference `var(--brand-primary-fg)` etc.
 */
import type { ColorValue, DesignTokens, SystemColorTokens } from './schema.js';

const WHITE = '#FFFFFF';
const NEAR_BLACK = '#1A1A1A';
const MID_GREY_DARK = '#0F172A';
const MID_GREY_LIGHT = '#F8FAFC';

/** WCAG AA threshold for normal-weight text under ~18pt. */
export const WCAG_AA_NORMAL = 4.5;

/** sRGB relative luminance per WCAG 2.x — input must be #RGB / #RRGGBB / #RRGGBBAA. */
export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const transform = (channel: number): number => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * transform(rgb.r) + 0.7152 * transform(rgb.g) + 0.0722 * transform(rgb.b);
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Returns true when fg-on-bg contrast meets the given threshold (default AA 4.5:1). */
export function meetsContrast(fg: string, bg: string, threshold = WCAG_AA_NORMAL): boolean {
  return contrastRatio(fg, bg) >= threshold;
}

/**
 * Pick the best foreground for a given background, trying user-supplied
 * candidates first, then a hard-coded fallback chain. Returns the first
 * candidate that meets WCAG AA — or the highest-contrast candidate if
 * none pass.
 */
export function pickForegroundFromCandidates(
  bgHex: string,
  candidates: ReadonlyArray<string>,
): string {
  let best = candidates[0] ?? WHITE;
  let bestRatio = -Infinity;
  for (const c of candidates) {
    if (!c) continue;
    const r = contrastRatio(c, bgHex);
    if (r >= WCAG_AA_NORMAL) return c;
    if (r > bestRatio) {
      best = c;
      bestRatio = r;
    }
  }
  return best;
}

/** Backward-compat shorthand: white or near-black, whichever has more contrast. */
export function pickForeground(bgHex: string): string {
  return pickForegroundFromCandidates(bgHex, [WHITE, NEAR_BLACK]);
}

/**
 * Augment a color palette with auto-paired `${slot}-fg` entries.
 * Candidate order per slot:
 *   1. palette.text  — operator-set text color (most semantically right).
 *   2. palette.background / surface — high-contrast neutrals from the same
 *      palette (so the fg looks "in-brand", not just generic white).
 *   3. White / near-black / mid-greys — last-resort fallbacks.
 * The first candidate clearing 4.5:1 wins. Operator-supplied
 * `${slot}-fg` keys (e.g. via custom palette) are preserved untouched.
 */
export function paletteWithFg(palette: SystemColorTokens): SystemColorTokens & Record<string, string> {
  const out: Record<string, string> = { ...palette };

  const candidates = [
    palette.text,
    palette.background,
    palette.surface,
    WHITE,
    NEAR_BLACK,
    MID_GREY_DARK,
    MID_GREY_LIGHT,
  ].filter((c): c is string => typeof c === 'string' && c.length > 0);

  for (const [slot, hex] of Object.entries(palette)) {
    const fgKey = `${slot}-fg`;
    // Skip if operator already supplied this fg slot via a custom token.
    if (out[fgKey]) continue;
    out[fgKey] = pickForegroundFromCandidates(hex, candidates);
  }
  return out as SystemColorTokens & Record<string, string>;
}

/** Resolve a ColorValue to a literal hex (server-side render) using a tokens snapshot. */
export function resolveColorToHex(
  c: ColorValue | undefined,
  tokens: DesignTokens,
  fallback = 'transparent',
): string {
  if (!c) return fallback;
  if (c.hex) return c.hex;
  if (c.token) {
    const sys = tokens.colors.system as unknown as Record<string, string>;
    if (sys[c.token]) return sys[c.token]!;
    if (tokens.colors.custom[c.token]) return tokens.colors.custom[c.token]!;
  }
  return fallback;
}

/** Resolve a ColorValue to a CSS string — `var(--brand-{token})` if token,
 *  literal hex otherwise. Used by both canvas and storefront resolvers. */
export function resolveColorToCss(c: ColorValue | undefined, fallback = 'inherit'): string {
  if (!c) return fallback;
  if (c.token) return `var(--brand-${c.token})`;
  if (c.hex) return c.hex;
  return fallback;
}

// ─── helpers ───────────────────────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  let s = hex.trim().replace(/^#/, '');
  if (s.length === 3) s = s.split('').map((c) => c + c).join('');
  if (s.length === 8) s = s.slice(0, 6); // strip alpha for luminance
  if (s.length !== 6) return null;
  const num = parseInt(s, 16);
  if (Number.isNaN(num)) return null;
  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  };
}
