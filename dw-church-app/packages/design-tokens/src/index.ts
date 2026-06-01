/**
 * @dw-church/design-tokens — single source of truth for design system tokens
 * across server (Theme schema), admin (canvas preview), storefront (Next.js
 * render), and the AI Designer agent.
 *
 * See docs/AI-DESIGN-SYSTEM-INTEGRATION-PLAN.md for the multi-phase rollout.
 */
export {
  // schema (Zod)
  systemColorTokensSchema,
  designTokenColorsSchema,
  typographyScaleSpecSchema,
  designTokenTypographySchema,
  designTokensSchema,
  blockStyleSchema,
  colorValueSchema,
  typographyStyleSchema,
  spacingStyleSchema,
  backgroundStyleSchema,
  overlayStyleSchema,
  borderConfigSchema,
  shadowConfigSchema,
  sizeStyleSchema,
  alignmentStyleSchema,
  responsiveOverridesSchema,
  breakpointSchema,
  typographyScaleNameSchema,
  textAlignSchema,
  textTransformSchema,
  fontWeightAliasSchema,
  shadowPresetSchema,
  // const
  typographyScaleNames,
} from './schema.js';

// UI labels — operator-facing strings for inspector / ThemeEditor token pickers.
// Kept out of schema.ts so the runtime Zod definitions stay UI-agnostic.
export {
  TYPOGRAPHY_SCALE_LABELS,
  SHADOW_PRESET_LABELS,
  RADIUS_PRESET_LABELS,
  FONT_FAMILY_OPTIONS,
} from './ui-labels.js';
export type { FontFamilyOption } from './ui-labels.js';

export type {
  SystemColorTokens,
  DesignTokenColors,
  TypographyScaleSpec,
  DesignTokenTypography,
  DesignTokens,
  BlockStyle,
  ColorValue,
  BoxSides,
  TypographyStyle,
  SpacingStyle,
  BackgroundStyle,
  OverlayStyle,
  BorderConfig,
  ShadowConfig,
  SizeStyle,
  AlignmentStyle,
  ResponsiveOverrides,
  Breakpoint,
  TypographyScaleName,
} from './schema.js';

export {
  DEFAULT_DESIGN_TOKENS,
  FONT_SIZE_PRESETS,
  SPACING_PRESETS,
} from './defaults.js';

export type {
  FontSizePresetName,
  SpacingPresetName,
} from './defaults.js';

export {
  tokensToCssVars,
  tokensToCssText,
} from './to-css-vars.js';

export type {
  CssVarMap,
} from './to-css-vars.js';

export {
  relativeLuminance,
  contrastRatio,
  meetsContrast,
  WCAG_AA_NORMAL,
  pickForeground,
  pickForegroundFromCandidates,
  paletteWithFg,
  resolveColorToHex,
  resolveColorToCss,
} from './contrast.js';

export { legacyThemeToTokens } from './from-legacy.js';
export type { LegacyThemeBlob } from './from-legacy.js';

export {
  applyFontSizePreset,
  applySpacingPreset,
  detectFontSizePreset,
  detectSpacingPreset,
} from './apply-preset.js';
