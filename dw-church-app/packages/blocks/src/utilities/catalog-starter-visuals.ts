/**
 * Visual sheet for the 3 catalog starter designs.
 *
 * Each starter (operator picked at "새 카탈로그" time) maps to a fully-
 * specified visual identity: typography family + weight + tracking, palette
 * (paper / ink / accent / muted), and per-block layout flags. The block
 * dispatchers (Cover/TOC/ProductPage/BackCover) read `style` from the
 * section's props, resolve to one of three sub-components, and pull
 * shared palette/typography off this sheet.
 *
 * The three designs are deliberately distinct in *layout structure*, not
 * just color/font — see variants/editorial, variants/grid, variants/
 * corporate for the actual JSX trees. This sheet only carries the cross-
 * cutting tokens (palette, font stack) that every variant shares.
 *
 * Per CLAUDE.md: the visuals here are *operator-selected specifications*,
 * not silent defaults — the picker makes the choice explicit.
 *
 * Legacy 5-id values from migrations/0025 (`modern-minimal`, etc.) are
 * normalized to one of the three new IDs via `normalizeStarterStyle()` so
 * any catalog row or section that wasn't covered by the 0026 data
 * migration still renders correctly.
 */

export type CatalogStarterStyle = 'editorial' | 'grid' | 'corporate';

export interface CatalogStarterVisuals {
  /** Page paper / ink colors. */
  paper: string;
  ink: string;
  inkMuted: string;
  rule: string;
  /** Single accent color used for numbers, dividers, eyebrow caps. */
  accent: string;
  /** font-family stack for body. */
  bodyFamily: string;
  /** font-family stack for headlines. */
  headingFamily: string;
  /** Heading weight (CSS font-weight value, e.g. '700'). */
  headingWeight: string;
  /** Heading letter tracking (em). */
  headingTracking: string;
  /** Eyebrow uppercase letter tracking (em). */
  eyebrowTracking: string;
  /** Image area background (visible while photos load or are missing). */
  imagePlaceholderBg: string;
  /** Eyebrow label strings the blocks render — kept here so each starter
   *  can speak its own dialect (PRODUCT vs PLATE vs CATALOGUE) without
   *  baking English defaults inside the renderer. */
  productEyebrow: string;
}

/**
 * Editorial — full-bleed hero images, large serif headlines, warm cream
 * paper. Each product gets a single dramatic spread. Best fit for
 * fashion / artisanal / lifestyle brands where story matters more than
 * SKU density.
 */
const EDITORIAL: CatalogStarterVisuals = {
  paper: '#faf7f2',
  ink: '#1c1410',
  inkMuted: '#7a6a5f',
  rule: '#e9dfd2',
  accent: '#7c2d12',
  bodyFamily:
    "'Source Serif Pro', 'Noto Serif KR', Georgia, 'Times New Roman', serif",
  headingFamily:
    "'Playfair Display', 'Noto Serif KR', Georgia, 'Times New Roman', serif",
  headingWeight: '700',
  headingTracking: '-0.015em',
  eyebrowTracking: '0.4em',
  imagePlaceholderBg: '#f3ece1',
  productEyebrow: 'FEATURED',
};

/**
 * Grid — image-first, near-monochrome, text reduced to corner captions.
 * The image carries 95%+ of the spread; metadata is one line max. Best
 * fit for interior / ceramics / photography portfolios.
 */
const GRID: CatalogStarterVisuals = {
  paper: '#fafafa',
  ink: '#0a0a0a',
  inkMuted: '#737373',
  rule: '#d4d4d4',
  accent: '#0a0a0a',
  bodyFamily:
    "'Inter', 'Pretendard', system-ui, -apple-system, 'Segoe UI', sans-serif",
  headingFamily:
    "'Inter', 'Pretendard', system-ui, -apple-system, 'Segoe UI', sans-serif",
  headingWeight: '500',
  headingTracking: '-0.01em',
  eyebrowTracking: '0.3em',
  imagePlaceholderBg: '#ededed',
  productEyebrow: 'PLATE',
};

/**
 * Corporate — structured B2B catalogue. 3-row cover (brand / title /
 * vision), tabular TOC, 2×2 product grid (image / SKU / specs / copy),
 * company-info closing page. Navy accent ties the structural rules
 * together without competing with product photography.
 */
const CORPORATE: CatalogStarterVisuals = {
  paper: '#ffffff',
  ink: '#0f1e3a',
  inkMuted: '#475569',
  rule: '#cbd5e1',
  accent: '#1e3a8a',
  bodyFamily:
    "'IBM Plex Sans', 'Pretendard', 'Helvetica Neue', system-ui, sans-serif",
  headingFamily:
    "'IBM Plex Sans', 'Pretendard', 'Helvetica Neue', system-ui, sans-serif",
  headingWeight: '700',
  headingTracking: '-0.005em',
  eyebrowTracking: '0.32em',
  imagePlaceholderBg: '#f1f5f9',
  productEyebrow: 'CATALOGUE',
};

const SHEETS: Record<CatalogStarterStyle, CatalogStarterVisuals> = {
  editorial: EDITORIAL,
  grid: GRID,
  corporate: CORPORATE,
};

/**
 * Map any incoming style string (incl. legacy 5-id values from before
 * migrations/0026) to the canonical 3-id taxonomy. Used by the block
 * dispatchers as the first step so the rest of the pipeline only ever
 * sees `editorial | grid | corporate`. Unknown / missing values fall
 * back to `editorial` (matches the picker's pre-selected default).
 */
export function normalizeStarterStyle(
  s: string | null | undefined,
): CatalogStarterStyle {
  switch (s) {
    case 'editorial':
    case 'grid':
    case 'corporate':
      return s;
    // Legacy 0025-era IDs (5-design picker) — map to nearest 3-id.
    case 'editorial-hero':
    case 'modern-minimal':
      return 'editorial';
    case 'portfolio-grid':
    case 'zen-minimal':
      return 'grid';
    default:
      return 'editorial';
  }
}

/**
 * Look up the visual sheet for an operator-picked starter. Always
 * resolves through `normalizeStarterStyle` first so legacy values keep
 * rendering.
 */
export function getStarterVisuals(
  style: string | undefined | null,
): CatalogStarterVisuals {
  return SHEETS[normalizeStarterStyle(style)];
}
