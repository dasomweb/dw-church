/**
 * Build a per-tenant <style> block from the theme.typography overrides.
 *
 * The tenant layout emits the result inside a <style> tag scoped to
 * the tenant page subtree (via a data-* selector if needed). When a
 * level has all-empty fields, the level is skipped — the storefront's
 * default CSS variables in globals.css apply.
 *
 * Color resolution: if level.color is a palette key (primary / accent /
 * text / muted / etc.) we resolve it against theme.colors so the
 * operator can pick "Accent" once and have every later palette swap
 * stay consistent. Hex / rgb / var() values pass through unchanged.
 */

/**
 * Per-typography-level shape.
 *
 * `fontSize` accepts three input forms so operator and AI inputs both
 * stay responsive:
 *
 *   1. string `"48px"` — single value. We auto-derive a fluid scale
 *      so mobile gets ~70% of the desktop size (matches the globals.css
 *      `clamp(min, preferred, max)` pattern that's already in the
 *      stylesheet defaults). Prevents the long-standing "operator
 *      sets H1 to 48px → mobile heroes get a 48px headline that
 *      overflows" footgun.
 *   2. object `{ desktop: "48px", mobile: "32px" }` — explicit
 *      breakpoint values. Emitted as `font-size: 48px` at root +
 *      `@media (max-width: 767px) { font-size: 32px }` override.
 *   3. CSS keyword / clamp expression — passed through verbatim.
 *      e.g. operator typed `clamp(2rem, 3vw, 3rem)` themselves.
 */
interface TypographyLevel {
  fontFamily?: string;
  fontSize?: string | { desktop?: string; mobile?: string };
  fontWeight?: string;
  letterSpacing?: string;
  lineHeight?: string;
  color?: string;
  /** Theme editor stores per-breakpoint mobile overrides under a separate
   *  `mobile` object (e.g. `{ fontSize: '14px' }`), NOT inside `fontSize`.
   *  Must be read here or the operator's explicit mobile sizes are dropped
   *  and headings/body fall back to the desktop-derived clamp — which left
   *  body text at ~11px on phones (대표님 2026-05-29 모바일 최적화). */
  mobile?: { fontSize?: string };
}

/**
 * Combine a level's desktop `fontSize` with its explicit `mobile.fontSize`
 * (the shape the theme editor actually persists) into the {desktop,mobile}
 * form normalizeFontSize understands. When no explicit mobile is set, the
 * raw `fontSize` flows through (string → auto fluid clamp, etc.).
 */
function fontSizeInputForLevel(
  level: TypographyLevel,
): string | { desktop?: string; mobile?: string } | undefined {
  const mobileFs = level.mobile?.fontSize?.trim();
  if (mobileFs) {
    const desktop = typeof level.fontSize === 'string'
      ? level.fontSize
      : level.fontSize?.desktop;
    return { desktop, mobile: mobileFs };
  }
  return level.fontSize;
}

interface TypographyMap {
  [level: string]: TypographyLevel | undefined;
}

interface ColorMap {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  surface?: string;
  text?: string;
  muted?: string;
  border?: string;
}

const PALETTE_KEYS: Array<keyof ColorMap> = [
  'primary', 'secondary', 'accent', 'background', 'surface', 'text', 'muted', 'border',
];

function resolveColor(value: string | undefined, colors: ColorMap | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  // Already a CSS literal — pass through verbatim.
  if (trimmed.startsWith('#') || trimmed.startsWith('rgb') || trimmed.startsWith('hsl') || trimmed.startsWith('var(')) {
    return trimmed;
  }
  // Palette key — resolve. Falls through to the literal if not found
  // (e.g. operator typed "warning" — let the browser try).
  const k = trimmed as keyof ColorMap;
  if (PALETTE_KEYS.includes(k) && colors?.[k]) return colors[k];
  return trimmed;
}

/**
 * Normalize the operator's fontSize input into desktop + optional
 * mobile values. Both are valid CSS length strings ready for emission.
 *
 *   "48px"                              → { desktop: 'clamp(33.6px, …, 48px)' }   (fluid auto-derived)
 *   "1.5rem"                            → { desktop: 'clamp(1.05rem, …, 1.5rem)' }
 *   { desktop: '48px', mobile: '28px' } → { desktop: '48px', mobile: '28px' }
 *   "clamp(2rem, 3vw, 3rem)"            → { desktop: 'clamp(2rem, 3vw, 3rem)' }   (already responsive)
 */
function normalizeFontSize(
  input: string | { desktop?: string; mobile?: string } | undefined,
): { desktop?: string; mobile?: string } {
  if (!input) return {};
  if (typeof input === 'object') {
    const desktop = input.desktop?.trim();
    const mobile = input.mobile?.trim();
    return { desktop: desktop || undefined, mobile: mobile || undefined };
  }
  const v = input.trim();
  if (!v) return {};
  // Already a fluid expression (clamp / min / max / calc with vw): pass through.
  if (/^(clamp|min|max|calc)\s*\(/i.test(v)) return { desktop: v };
  // Try to derive fluid scale from a single px/rem value. Mobile = 70%
  // of the input, viewport-linked midpoint with vw so the transition
  // is smooth instead of a hard breakpoint.
  const match = v.match(/^(-?\d+(?:\.\d+)?)(px|rem|em)$/i);
  if (match) {
    const value = parseFloat(match[1]!);
    const unit = match[2]!;
    const mobile = (value * 0.7).toFixed(2).replace(/\.?0+$/, '');
    // Preferred = 4vw + 0.5rem 같이 viewport 기반 — clamp 가 mobile/
    // desktop 사이 부드럽게 보간하도록.
    const preferred = unit === 'rem' || unit === 'em'
      ? `${(value * 0.5).toFixed(2).replace(/\.?0+$/, '')}vw + 0.5${unit}`
      : `${(value / 16 * 0.5).toFixed(2).replace(/\.?0+$/, '')}vw + 0.5rem`;
    return { desktop: `clamp(${mobile}${unit}, ${preferred}, ${v})` };
  }
  // Unknown shape — pass through (e.g. "smaller", "1.2em var(--foo)").
  return { desktop: v };
}

function fontFamilyValue(family: string | undefined): string | undefined {
  if (!family) return undefined;
  const f = family.trim();
  if (!f) return undefined;
  // Quote font names that contain spaces; preserve quoted/var() values.
  if (f.startsWith('var(') || f.startsWith('"') || f.startsWith("'")) return f;
  return `"${f}", system-ui, -apple-system, sans-serif`;
}

function levelToDecls(
  level: TypographyLevel | undefined,
  colors: ColorMap | undefined,
): { desktop: string[]; mobile: string[] } {
  if (!level) return { desktop: [], mobile: [] };
  // Plain declarations without !important — relying on natural CSS
  // specificity. Why this is safe and correct:
  //
  //   1. Blocks reference typography via `style={{ fontSize:
  //      'var(--fs-h1)' }}` inline. The variable is defined at the
  //      scope root via rootVarDecls() above, so operator typography
  //      changes propagate via the variable cascade — no need for
  //      !important to "win" over inline.
  //
  //   2. The h1/h2/...selector rules below this function provide a
  //      fallback for blocks that *don't* use the var() pattern (e.g.
  //      raw <h1>Title</h1> in a free-form HTML field). For those, a
  //      regular `.scope h1 { font-size: 24px }` rule has specificity
  //      (0,1,1) — beats `.text-white` (0,1,0) but loses to inline
  //      `style="font-size: ..."` (1,0,0,0). That's exactly the
  //      cascade we want: per-element inspector overrides win,
  //      which !important would have broken.
  //
  //   3. Operator's per-element style overrides write inline via
  //      mergeElementStyle. Inline naturally beats class. With
  //      !important on the class rule, the operator's deliberate
  //      override was being silently swallowed — the bug operators
  //      reported as "글로벌로 고정되어있는 것 같다."
  //
  // Earlier code !important'd every axis for fear of hardcoded block
  // CSS escaping the global theme. The cost (per-element overrides
  // dying) is much higher than that hypothetical risk — and any block
  // that hardcodes typography values is the block's bug, not a
  // reason to break the override system globally.
  const decls: string[] = [];
  const mobileDecls: string[] = [];
  const family = fontFamilyValue(level.fontFamily);
  if (family) decls.push(`font-family: ${family};`);
  const sizes = normalizeFontSize(fontSizeInputForLevel(level));
  if (sizes.desktop) decls.push(`font-size: ${sizes.desktop};`);
  if (sizes.mobile) mobileDecls.push(`font-size: ${sizes.mobile};`);
  if (level.fontWeight?.trim()) decls.push(`font-weight: ${level.fontWeight.trim()};`);
  if (level.letterSpacing?.trim()) decls.push(`letter-spacing: ${level.letterSpacing.trim()};`);
  if (level.lineHeight?.trim()) decls.push(`line-height: ${level.lineHeight.trim()};`);
  const color = resolveColor(level.color, colors);
  if (color) decls.push(`color: ${color};`);
  return { desktop: decls, mobile: mobileDecls };
}

/**
 * Map typography levels to the CSS custom property they should override
 * at the scope root. Blocks reference these variables via
 * `style={{ fontSize: 'var(--fs-h2)' }}`, so changing the variable on
 * the scope element makes every block instantly pick up the new size
 * without any block-level edits.
 */
// Each level maps to ITS OWN CSS variable. Earlier the table aliased
// h5 → --fs-lg and h6 → --fs-base, but those vars are also used by
// blocks for sub-headings and body text — so changing H5 in the
// typography editor was unexpectedly resizing every "secondary"
// piece of copy in every block. Now H5 and H6 only affect their own
// vars, and any block that wants operator-controllable H5 sizing
// references --fs-h5 explicitly.
const LEVEL_TO_FONT_SIZE_VAR: Record<string, string> = {
  h1: '--fs-h1',
  h2: '--fs-h2',
  h3: '--fs-h3',
  h4: '--fs-h4',
  h5: '--fs-h5',
  h6: '--fs-h6',
  paragraph: '--fs-base',
  body: '--fs-base',
};

/**
 * Aggregate :root-level overrides for the whole typography object.
 * Returns CSS declarations like `--fs-h1: 32px;` that are applied at the
 * scope element so block inline `var(--fs-h1)` references resolve to the
 * operator's value. Without this, raising H1 in the editor only affected
 * `<h1>` selectors — but the storefront blocks set
 * `style={{ fontSize: 'var(--fs-h1)' }}` inline (higher specificity).
 */
function rootVarDecls(
  typography: TypographyMap | undefined,
): { desktop: string[]; mobile: string[] } {
  if (!typography) return { desktop: [], mobile: [] };
  const decls: string[] = [];
  const mobileDecls: string[] = [];
  for (const [level, varName] of Object.entries(LEVEL_TO_FONT_SIZE_VAR)) {
    const lvl = typography[level];
    const sizes = normalizeFontSize(lvl ? fontSizeInputForLevel(lvl) : undefined);
    if (sizes.desktop) decls.push(`${varName}: ${sizes.desktop};`);
    if (sizes.mobile)  mobileDecls.push(`${varName}: ${sizes.mobile};`);
  }
  const headingFamily = fontFamilyValue(typography.h1?.fontFamily);
  if (headingFamily) decls.push(`--dw-font-heading: ${headingFamily};`);
  const bodyFamily = fontFamilyValue(typography.body?.fontFamily ?? typography.paragraph?.fontFamily);
  if (bodyFamily) decls.push(`--dw-font-body: ${bodyFamily};`);
  return { desktop: decls, mobile: mobileDecls };
}

interface BuildTypographyCssParams {
  typography: TypographyMap | undefined;
  colors: ColorMap | undefined;
  /**
   * Selector prefix for scoping. The tenant layout adds a parent
   * selector like `[data-tenant="slug"]` so admin / shared pages aren't
   * affected by per-tenant typography rules. Pass '' for global scope.
   */
  scope?: string;
}

export function buildTypographyCss({ typography, colors, scope = '' }: BuildTypographyCssParams): string {
  if (!typography || Object.keys(typography).length === 0) return '';
  const prefix = scope ? `${scope} ` : '';
  const blocks: string[] = [];
  // Tablet-and-below breakpoint. Matches the Tailwind `md:` threshold
  // every section block already pivots on (`md:grid-cols-2`, etc.) so
  // the typography swap fires at the same point the layout shifts.
  const mobileMediaOpen = '@media (max-width: 767px) {';

  // 1) Scope-root variable overrides. Block inline styles reference
  // var(--fs-h1) etc., so overriding the variables here is what actually
  // makes operator typography flow into the rendered blocks. Desktop
  // values go on the scope root; mobile values go inside an @media
  // rule that re-overrides only the size variables.
  const rootSizes = rootVarDecls(typography);
  const rootSelector = scope || ':root';
  if (rootSizes.desktop.length > 0) {
    blocks.push(`${rootSelector} { ${rootSizes.desktop.join(' ')} }`);
  }
  if (rootSizes.mobile.length > 0) {
    blocks.push(`${mobileMediaOpen} ${rootSelector} { ${rootSizes.mobile.join(' ')} } }`);
  }

  // 2) Per-level selector rules (h1, h2, ...) — desktop at root,
  // mobile inside @media. Inspector inline-style overrides still
  // win via specificity (no !important).
  //
  // Block components opt into a typography level by adding the matching
  // .b2b-* class to their non-heading element. Convention:
  //   .b2b-display     → h1 (largest visual weight)
  //   .b2b-stat-value  → h1 alias (StatsCounterBlock <dd>)
  //   .b2b-stat-label  → body alias (StatsCounterBlock <dt>)
  //   .b2b-card-title  → h4 (FeaturesGrid item titles)
  //   .b2b-eyebrow     → accent (small uppercase pill)
  const levelSelectors: Record<string, string> = {
    h1: 'h1, .b2b-display, .b2b-stat-value',
    h2: 'h2',
    h3: 'h3',
    h4: 'h4, .b2b-card-title',
    h5: 'h5',
    h6: 'h6',
    paragraph: 'p',
    body: 'body, .b2b-body, .b2b-stat-label',
    accent: '.b2b-accent, .b2b-eyebrow',
    button: '.b2b-btn, button.b2b-btn',
  };

  const mobileRules: string[] = [];
  for (const [level, selector] of Object.entries(levelSelectors)) {
    const { desktop, mobile } = levelToDecls(typography[level], colors);
    if (desktop.length > 0) {
      blocks.push(`${prefix}${selector} { ${desktop.join(' ')} }`);
    }
    if (mobile.length > 0) {
      mobileRules.push(`${prefix}${selector} { ${mobile.join(' ')} }`);
    }
  }
  if (mobileRules.length > 0) {
    blocks.push(`${mobileMediaOpen} ${mobileRules.join(' ')} }`);
  }

  return blocks.join('\n');
}
