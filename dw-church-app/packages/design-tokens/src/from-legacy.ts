/**
 * Adapter: legacy Theme blob → DesignTokens.
 *
 * The current Theme schema (apps/server/src/modules/themes/schema.ts) is a
 * loose collection of `colors`, `fonts`, and `typography` (per-level CSS
 * strings). Most existing tenants only have these. The storefront still
 * needs to emit `var(--brand-*)` so that Phase-1 block overrides resolve
 * correctly — so we project the legacy blob onto a DesignTokens snapshot
 * at fetch time.
 *
 * If the theme already supplies `tokensV2`, callers should prefer that and
 * skip this adapter (a future writer will populate tokensV2 directly).
 */
import type { DesignTokens, TypographyScaleName, TypographyScaleSpec, SystemColorTokens } from './schema.js';
import { DEFAULT_DESIGN_TOKENS } from './defaults.js';

/** Shape of the legacy theme `settings` JSONB this adapter accepts. */
export interface LegacyThemeBlob {
  colors?: Partial<Record<keyof SystemColorTokens, string | undefined>>;
  fonts?: {
    heading?: string;
    body?: string;
    koreanFont?: string;
  };
  typography?: Partial<Record<
    TypographyScaleName | 'paragraph' | 'accent',
    {
      fontFamily?: string;
      fontSize?: string;
      fontWeight?: string;
      letterSpacing?: string;
      lineHeight?: string;
      color?: string;
    } | undefined
  >>;
  tokensV2?: DesignTokens;
}

const FONT_WEIGHT_MAP: Record<string, number> = {
  thin: 100,
  extralight: 200,
  light: 300,
  normal: 400,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
};

function parsePxNumber(s: string | undefined, fallback: number): number {
  if (!s) return fallback;
  const m = /(-?\d+(?:\.\d+)?)\s*px/i.exec(s);
  if (m && m[1]) return Math.round(Number(m[1]));
  // bare number → assume px
  const bare = Number(s);
  return Number.isFinite(bare) ? Math.round(bare) : fallback;
}

function parseWeight(s: string | undefined, fallback: number): number {
  if (!s) return fallback;
  const num = Number(s);
  if (Number.isFinite(num) && num >= 100 && num <= 900) return num;
  const named = FONT_WEIGHT_MAP[s.toLowerCase().trim()];
  return named ?? fallback;
}

function parseUnitless(s: string | undefined, fallback: number): number {
  if (!s) return fallback;
  const num = Number(s);
  return Number.isFinite(num) && num > 0 ? num : fallback;
}

/**
 * Convert a legacy theme blob to a complete DesignTokens snapshot.
 * Missing fields fall back to DEFAULT_DESIGN_TOKENS — never undefined.
 *
 * Resolution order (least to most specific):
 *   1. DEFAULT_DESIGN_TOKENS (baseline)
 *   2. tokensV2 (full snapshot, e.g. AI Designer output or preset picker)
 *   3. legacy `colors` / `fonts` / `typography` per-level edits
 *
 * The result is the merged effective tokens. Stage 3 lets the granular
 * TypographyEditor coexist with stage-2 preset writers — operator-set
 * per-level fontSize / weight / lineHeight / color always wins on its
 * specific scale, while everything else inherits from the broader
 * snapshot.
 */
export function legacyThemeToTokens(theme: LegacyThemeBlob | null | undefined): DesignTokens {
  const t = theme ?? {};

  // Stage 1+2: start with tokensV2 if present, otherwise build a snapshot
  // from the legacy colors / fonts shape with DEFAULTS underneath.
  const hasV2 = Boolean(t.tokensV2);
  const base = hasV2 ? cloneTokens(t.tokensV2!) : buildFromLegacyShape(t);

  // Stage 3: overlay legacy per-level typography — ONLY when there is no
  // tokensV2. When tokensV2 exists it IS the authoritative snapshot (the
  // super-admin TypographyEditor writes the full scale set there). Overlaying
  // the stale legacy `settings.typography` (seed / old editor) on top would
  // clobber the operator's new scale edits with the pre-change values — i.e.
  // change Body size in the editor, save → tokensV2 updated, but the read
  // reverts it to the legacy value. (대표님 2026-06-09 "변경전 내용이 그대로".)
  if (!hasV2 && t.typography) {
    overlayLegacyTypography(base, t.typography);
  }

  return base;
}

function cloneTokens(t: DesignTokens): DesignTokens {
  return {
    colors: { system: { ...t.colors.system }, custom: { ...t.colors.custom } },
    typography: {
      families: { ...t.typography.families },
      scales: { ...t.typography.scales } as DesignTokens['typography']['scales'],
    },
    breakpoints: { ...t.breakpoints },
    shadows: { ...t.shadows },
    radius: { ...t.radius },
    containerMax: t.containerMax,
    spacing: { ...t.spacing },
    // tokensV2 blobs persisted before `header` existed won't carry it —
    // fall back to the default so the projection is always complete.
    header: { ...DEFAULT_DESIGN_TOKENS.header, ...(t.header ?? {}) },
    footer: { ...DEFAULT_DESIGN_TOKENS.footer, ...(t.footer ?? {}) },
  };
}

function buildFromLegacyShape(theme: Omit<LegacyThemeBlob, 'tokensV2'>): DesignTokens {
  const t = theme;
  const baseSystem: SystemColorTokens = { ...DEFAULT_DESIGN_TOKENS.colors.system };
  if (t.colors) {
    for (const [k, v] of Object.entries(t.colors)) {
      if (v && typeof v === 'string') {
        (baseSystem as Record<string, string>)[k] = v;
      }
    }
  }

  const headingFont = t.fonts?.heading?.trim() || DEFAULT_DESIGN_TOKENS.typography.families.heading;
  const bodyFont = t.fonts?.body?.trim() || DEFAULT_DESIGN_TOKENS.typography.families.body;
  const koreanFont = t.fonts?.koreanFont?.trim() || DEFAULT_DESIGN_TOKENS.typography.families.korean;

  // Scales start from defaults — typography overlay happens in stage-3 of
  // the unified resolver so it applies consistently whether the base came
  // from tokensV2 or this legacy shape.
  const scales: Record<TypographyScaleName, TypographyScaleSpec> = {
    ...DEFAULT_DESIGN_TOKENS.typography.scales,
  } as Record<TypographyScaleName, TypographyScaleSpec>;

  return {
    colors: { system: baseSystem, custom: {} },
    typography: {
      families: { heading: headingFont, body: bodyFont, korean: koreanFont },
      scales,
    },
    breakpoints: { ...DEFAULT_DESIGN_TOKENS.breakpoints },
    shadows: { ...DEFAULT_DESIGN_TOKENS.shadows },
    radius: { ...DEFAULT_DESIGN_TOKENS.radius },
    containerMax: DEFAULT_DESIGN_TOKENS.containerMax,
    spacing: { ...DEFAULT_DESIGN_TOKENS.spacing },
    header: { ...DEFAULT_DESIGN_TOKENS.header },
    footer: { ...DEFAULT_DESIGN_TOKENS.footer },
  };
}

type LegacyTypoLevel = {
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  letterSpacing?: string;
  lineHeight?: string;
  color?: string;
};

function overlayLegacyTypography(
  tokens: DesignTokens,
  typo: NonNullable<LegacyThemeBlob['typography']>,
): void {
  const overlay = (target: TypographyScaleName, src: LegacyTypoLevel | undefined): void => {
    if (!src) return;
    const cur = tokens.typography.scales[target];
    if (!cur) return;
    tokens.typography.scales[target] = {
      fontFamily: src.fontFamily ?? cur.fontFamily,
      size: { ...cur.size, desktop: parsePxNumber(src.fontSize, cur.size.desktop) },
      weight: parseWeight(src.fontWeight, cur.weight),
      lineHeight: parseUnitless(src.lineHeight, cur.lineHeight),
      letterSpacing: src.letterSpacing ? parsePxNumber(src.letterSpacing, cur.letterSpacing ?? 0) : cur.letterSpacing,
      transform: cur.transform,
    };
  };
  overlay('h1', typo.h1);
  overlay('h2', typo.h2);
  overlay('h3', typo.h3);
  overlay('h4', typo.h4);
  overlay('h5', typo.h5);
  overlay('h6', typo.h6);
  overlay('body', typo.paragraph ?? typo.body);
  const legacyButton = (typo as Record<string, unknown>).button;
  if (legacyButton && typeof legacyButton === 'object') {
    overlay('button', legacyButton as LegacyTypoLevel);
  }
}
