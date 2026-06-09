/**
 * Default values for a fresh project. The ThemeEditor preset picker (Phase 2)
 * will pivot off these — selecting "default" applies this snapshot, "compact"
 * shrinks the type scale, "large" / "xlarge" grow it.
 */
import type { DesignTokens, TypographyScaleName, TypographyScaleSpec } from './schema.js';

const defaultScales: Record<TypographyScaleName, TypographyScaleSpec> = {
  h1:       { fontFamily: 'heading', size: { desktop: 72, tablet: 56, mobile: 42 }, weight: 700, lineHeight: 1.15, letterSpacing: -0.5 },
  h2:       { fontFamily: 'heading', size: { desktop: 40, tablet: 36, mobile: 30 }, weight: 700, lineHeight: 1.2 },
  h3:       { fontFamily: 'heading', size: { desktop: 26, tablet: 24, mobile: 22 }, weight: 600, lineHeight: 1.25 },
  h4:       { fontFamily: 'heading', size: { desktop: 20, tablet: 19, mobile: 18 }, weight: 600, lineHeight: 1.3 },
  h5:       { fontFamily: 'heading', size: { desktop: 16, tablet: 16, mobile: 15 }, weight: 600, lineHeight: 1.35 },
  h6:       { fontFamily: 'heading', size: { desktop: 14, tablet: 14, mobile: 13 }, weight: 600, lineHeight: 1.4 },
  body:     { fontFamily: 'body',    size: { desktop: 16, tablet: 16, mobile: 15 }, weight: 400, lineHeight: 1.6 },
  caption:  { fontFamily: 'body',    size: { desktop: 13, tablet: 13, mobile: 12 }, weight: 400, lineHeight: 1.5 },
  overline: { fontFamily: 'body',    size: { desktop: 12, tablet: 12, mobile: 11 }, weight: 600, lineHeight: 1.4, letterSpacing: 1.5, transform: 'uppercase' },
  label:    { fontFamily: 'body',    size: { desktop: 14, tablet: 14, mobile: 13 }, weight: 500, lineHeight: 1.4 },
  button:   { fontFamily: 'body',    size: { desktop: 15, tablet: 15, mobile: 14 }, weight: 600, lineHeight: 1 },
};

export const DEFAULT_DESIGN_TOKENS: DesignTokens = {
  colors: {
    system: {
      primary: '#2563eb',
      secondary: '#7c3aed',
      accent: '#06b6d4',
      text: '#1e293b',
      muted: '#64748b',
      background: '#ffffff',
      border: '#e2e8f0',
      surface: '#f1f5f9',
    },
    custom: {},
  },
  typography: {
    families: {
      heading: "'Inter', 'Pretendard', system-ui, sans-serif",
      body: "'Inter', 'Pretendard', system-ui, sans-serif",
      korean: "'Pretendard', 'Noto Sans KR', system-ui, sans-serif",
    },
    scales: defaultScales,
  },
  breakpoints: {
    tablet: 1024,
    mobile: 640,
  },
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
    lg: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
    xl: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
  },
  radius: { sm: 4, md: 8, lg: 16, full: 9999 },
  containerMax: 1200,
  spacing: {
    sectionPaddingY: 75,
    containerPaddingX: 20,
    gapGrid: 24,
    sectionMarginY: 0,
  },
};

/**
 * Font-size preset table — Phase 2 ThemeEditor exposes these via a 4-radio
 * picker. compact/default/large/xlarge each scales the headings + body anchor.
 * `default` matches DEFAULT_DESIGN_TOKENS exactly.
 */
export const FONT_SIZE_PRESETS = {
  compact: {
    h1: { desktop: 56, mobile: 36 },
    h2: { desktop: 32, mobile: 26 },
    h3: { desktop: 24, mobile: 20 },
    h4: { desktop: 18, mobile: 16 },
    h5: { desktop: 16, mobile: 14 },
    h6: { desktop: 14, mobile: 12 },
    body: { desktop: 15, mobile: 14 },
    caption: { desktop: 12, mobile: 11 },
  },
  default: {
    h1: { desktop: 72, mobile: 42 },
    h2: { desktop: 40, mobile: 30 },
    h3: { desktop: 26, mobile: 22 },
    h4: { desktop: 20, mobile: 18 },
    h5: { desktop: 16, mobile: 15 },
    h6: { desktop: 14, mobile: 13 },
    body: { desktop: 16, mobile: 15 },
    caption: { desktop: 13, mobile: 12 },
  },
  large: {
    h1: { desktop: 88, mobile: 48 },
    h2: { desktop: 48, mobile: 34 },
    h3: { desktop: 30, mobile: 24 },
    h4: { desktop: 22, mobile: 20 },
    h5: { desktop: 18, mobile: 16 },
    h6: { desktop: 15, mobile: 14 },
    body: { desktop: 17, mobile: 16 },
    caption: { desktop: 14, mobile: 13 },
  },
  xlarge: {
    h1: { desktop: 96, mobile: 52 },
    h2: { desktop: 56, mobile: 38 },
    h3: { desktop: 36, mobile: 26 },
    h4: { desktop: 24, mobile: 22 },
    h5: { desktop: 20, mobile: 18 },
    h6: { desktop: 16, mobile: 15 },
    body: { desktop: 18, mobile: 17 },
    caption: { desktop: 15, mobile: 14 },
  },
} as const;

export type FontSizePresetName = keyof typeof FONT_SIZE_PRESETS;

/**
 * Spacing density presets. Phase 2 picker.
 */
export const SPACING_PRESETS = {
  cozy:    { sectionPaddingY: 48,  containerPaddingX: 16, gapGrid: 16, sectionMarginY: 0 },
  default: { sectionPaddingY: 75,  containerPaddingX: 20, gapGrid: 24, sectionMarginY: 0 },
  airy:    { sectionPaddingY: 100, containerPaddingX: 24, gapGrid: 32, sectionMarginY: 16 },
  spacious:{ sectionPaddingY: 140, containerPaddingX: 32, gapGrid: 40, sectionMarginY: 32 },
} as const;

export type SpacingPresetName = keyof typeof SPACING_PRESETS;
