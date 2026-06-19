/**
 * Design Tokens — single source of truth for B2B Smart's color / typography /
 * spacing / shadow / radius vocabulary across server (Theme), admin (canvas
 * preview), and storefront (Next.js render).
 *
 * Zod schema produces both runtime validation (server PATCH) and the inferred
 * TypeScript types consumed by the UI. Adding a new token = one file edit
 * here, then it propagates to every consumer through the workspace package.
 *
 * Absorbed and tightened from apps/canvas-ui/src/types/block-style.ts
 * (canvas-ui is no longer wired into the active PageBuilder; design tokens
 * are now owned here).
 */
import { z } from 'zod';

// ─── Color tokens ──────────────────────────────────────────────────────────
//
// 8 fixed system slots. Customs are open-ended (any string key, hex value).
// Order matters for the UI palette picker — primary first, then accent siblings,
// then text/background/structural.

export const systemColorTokensSchema = z.object({
  primary: z.string(),
  secondary: z.string(),
  accent: z.string(),
  text: z.string(),
  muted: z.string(),
  background: z.string(),
  border: z.string(),
  surface: z.string(),
});

export const designTokenColorsSchema = z.object({
  system: systemColorTokensSchema,
  custom: z.record(z.string()).default({}),
});

// ─── Typography tokens ─────────────────────────────────────────────────────
//
// 11 semantic scales. Each scale has responsive sizes (desktop/tablet/mobile)
// — Phase 2 will wire ThemeEditor preset pickers to these. Phase 0 emits only
// `desktop` to CSS vars; the responsive media-query emit lands in Phase 2.

export const breakpointSchema = z.enum(['desktop', 'tablet', 'mobile']);
export type Breakpoint = z.infer<typeof breakpointSchema>;

export const typographyScaleNames = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'body', 'caption', 'overline', 'label', 'button',
] as const;

export const typographyScaleNameSchema = z.enum(typographyScaleNames);
export type TypographyScaleName = z.infer<typeof typographyScaleNameSchema>;

export const textTransformSchema = z.enum(['none', 'uppercase', 'lowercase', 'capitalize']);

export const typographyScaleSpecSchema = z.object({
  /** Family reference: "heading" / "body" / "korean" or a literal CSS family. */
  fontFamily: z.string(),
  /** px sizes per breakpoint. desktop is required; others fall back to it. */
  size: z.object({
    desktop: z.number().int().positive(),
    tablet: z.number().int().positive().optional(),
    mobile: z.number().int().positive().optional(),
  }),
  /** 100..900 */
  weight: z.number().int().min(100).max(900),
  /** unitless line-height (1.0..2.5 reasonable range, no enforcement). */
  lineHeight: z.number().positive(),
  /** px letter-spacing (negative allowed for tight headings). */
  letterSpacing: z.number().optional(),
  transform: textTransformSchema.optional(),
});

export const designTokenTypographySchema = z.object({
  families: z.object({
    heading: z.string(),
    body: z.string(),
    korean: z.string(),
  }),
  scales: z.record(
    typographyScaleNameSchema,
    typographyScaleSpecSchema,
  ),
});

// ─── Shadows / radius / containers ─────────────────────────────────────────

export const shadowPresetSchema = z.enum(['sm', 'md', 'lg', 'xl']);

export const designTokenShadowsSchema = z.record(
  shadowPresetSchema,
  z.string(),
);

export const designTokenRadiusSchema = z.object({
  sm: z.number().int().nonnegative(),
  md: z.number().int().nonnegative(),
  lg: z.number().int().nonnegative(),
  full: z.number().int().nonnegative(),
});

// ─── Header tokens ─────────────────────────────────────────────────────────
//
// Per-tenant header chrome the operator tunes in the super-admin theme editor:
// logo render height + the desktop nav-link font size. Emitted as
// --brand-logo-height / --brand-nav-font-size and consumed by the storefront
// header (apps/web/.../tenant/[slug]/layout.tsx). The whole object + each
// field carries a default so token blobs persisted BEFORE this field existed
// still parse (and old AI-builder tokensV2 snapshots don't 400 on save).
export const designTokenHeaderSchema = z
  .object({
    /** Storefront logo <img> height in px (default 40 = the old hard-coded h-10). */
    logoHeight: z.number().int().positive().default(40),
    /** Desktop header nav-link font size in px (default 14 = the old text-sm). */
    navFontSize: z.number().int().positive().default(14),
    /** Desktop header nav-link font weight (100–900, default 500 = medium). */
    navFontWeight: z.number().int().min(100).max(900).default(500),
  })
  .default({ logoHeight: 40, navFontSize: 14, navFontWeight: 500 });

// ─── Footer tokens ─────────────────────────────────────────────────────────
//
// Per-tenant footer DESIGN the operator tunes in the super-admin theme editor's
// 풋터 tab. The footer's CONTENT (address / phone / social links) still comes
// from church settings; these tokens drive look + labels + copyright. The whole
// object + each field carries a default so token blobs persisted before this
// field existed still parse.
export const designTokenFooterSchema = z
  .object({
    /** Layout: columns (logo + 오시는 길 + Social), centered, or minimal. */
    variant: z.enum(['columns', 'centered', 'minimal']).default('columns'),
    /** Footer background color (hex). Default = dark navy. */
    background: z.string().default('#0b1622'),
    /** Body text color (hex). */
    text: z.string().default('#9ca3af'),
    /** Heading / label color (hex). */
    heading: z.string().default('#e5e7eb'),
    /** Show the brand area (logo or text) in the footer. */
    showLogo: z.boolean().default(true),
    /** Brand area mode: a logo image or a text wordmark. */
    brandMode: z.enum(['logo', 'text']).default('logo'),
    /** Footer-specific logo image URL (e.g. a light logo for a dark footer).
     *  Empty → falls back to the church settings logo. */
    logoUrl: z.string().default(''),
    /** Footer brand text (used when brandMode = 'text'). Empty → church name. */
    brandText: z.string().default(''),
    /** 오시는 길 column label. */
    directionsLabel: z.string().default('오시는 길'),
    /** Social column label. */
    socialLabel: z.string().default('Social Media / 온라인 예배'),
    /** Copyright line. Empty → auto "© {year} {CHURCH}. All rights Reserved." */
    copyright: z.string().default(''),
  })
  .default({
    variant: 'columns',
    background: '#0b1622',
    text: '#9ca3af',
    heading: '#e5e7eb',
    showLogo: true,
    brandMode: 'logo',
    logoUrl: '',
    brandText: '',
    directionsLabel: '오시는 길',
    socialLabel: 'Social Media / 온라인 예배',
    copyright: '',
  });

// ─── Final DesignTokens ────────────────────────────────────────────────────

export const designTokensSchema = z.object({
  colors: designTokenColorsSchema,
  typography: designTokenTypographySchema,
  breakpoints: z.object({
    tablet: z.number().int().positive(),
    mobile: z.number().int().positive(),
  }),
  shadows: designTokenShadowsSchema,
  radius: designTokenRadiusSchema,
  containerMax: z.number().int().positive(),
  /** Spacing tokens — section padding, container side padding, gap presets.
   *  Phase 2 will enrich these into preset pickers (compact/default/large/xlarge). */
  spacing: z.object({
    sectionPaddingY: z.number().int().nonnegative(),
    containerPaddingX: z.number().int().nonnegative(),
    gapGrid: z.number().int().nonnegative(),
    // Theme-level vertical margin BETWEEN stacked sections. Default 0 (sections
    // butt against each other; their own paddingY provides rhythm). `.default(0)`
    // keeps already-stored token blobs — which predate this field — parseable.
    sectionMarginY: z.number().int().nonnegative().default(0),
  }),
  /** Header chrome (logo size, nav font size). `.default` so pre-existing
   *  token blobs without a header key still parse. */
  header: designTokenHeaderSchema,
  /** Footer design (variant, colors, labels, copyright). `.default` so
   *  pre-existing token blobs without a footer key still parse. */
  footer: designTokenFooterSchema,
});

export type SystemColorTokens = z.infer<typeof systemColorTokensSchema>;
export type DesignTokenColors = z.infer<typeof designTokenColorsSchema>;
export type TypographyScaleSpec = z.infer<typeof typographyScaleSpecSchema>;
export type DesignTokenTypography = z.infer<typeof designTokenTypographySchema>;
export type DesignTokenHeader = z.infer<typeof designTokenHeaderSchema>;
export type DesignTokenFooter = z.infer<typeof designTokenFooterSchema>;
export type DesignTokens = z.infer<typeof designTokensSchema>;

// ─── BlockStyle — per-block override container ─────────────────────────────
//
// Used by Phase 1 (page_sections.style_overrides JSONB column). Defined here
// so server Zod and admin/storefront TS types share one definition.

export const colorValueSchema = z.object({
  /** Token name (primary / accent / muted / custom-key). Wins over hex. */
  token: z.string().optional(),
  /** Direct hex value (#RRGGBB or #RRGGBBAA). Used when token is absent. */
  hex: z.string().optional(),
}).strict();

export const boxSidesSchema = z.object({
  top: z.number().optional(),
  right: z.number().optional(),
  bottom: z.number().optional(),
  left: z.number().optional(),
}).strict();

export const fontWeightAliasSchema = z.enum(['regular', 'medium', 'semibold', 'bold']);
export const textAlignSchema = z.enum(['left', 'center', 'right', 'justify']);

export const typographyStyleSchema = z.object({
  scale: typographyScaleNameSchema.optional(),
  color: colorValueSchema.optional(),
  weight: fontWeightAliasSchema.optional(),
  align: textAlignSchema.optional(),
  lineHeight: z.number().positive().optional(),
  letterSpacing: z.number().optional(),
  transform: textTransformSchema.optional(),
}).strict();

export const spacingStyleSchema = z.object({
  padding: boxSidesSchema.optional(),
  margin: boxSidesSchema.optional(),
  gap: z.number().int().nonnegative().optional(),
}).strict();

export const gradientStopSchema = z.object({
  color: colorValueSchema,
  at: z.number().min(0).max(100),
}).strict();

export const gradientSchema = z.object({
  type: z.enum(['linear', 'radial']),
  angle: z.number().optional(),
  stops: z.array(gradientStopSchema).min(2),
}).strict();

export const backgroundImageSchema = z.object({
  url: z.string(),
  isLocal: z.boolean().optional(),
  position: z.enum([
    'center', 'top', 'bottom', 'left', 'right',
    'top-left', 'top-right', 'bottom-left', 'bottom-right',
  ]).optional(),
  size: z.enum(['cover', 'contain', 'auto']).optional(),
  repeat: z.enum(['no-repeat', 'repeat', 'repeat-x', 'repeat-y']).optional(),
  attachment: z.enum(['scroll', 'fixed']).optional(),
}).strict();

export const backgroundStyleSchema = z.object({
  color: colorValueSchema.optional(),
  image: backgroundImageSchema.optional(),
  gradient: gradientSchema.optional(),
}).strict();

export const overlayStyleSchema = z.object({
  color: colorValueSchema.optional(),
  gradient: gradientSchema.optional(),
  image: backgroundImageSchema.optional(),
  opacity: z.number().min(0).max(1).optional(),
  blendMode: z.enum(['normal', 'multiply', 'overlay', 'screen', 'darken', 'lighten']).optional(),
}).strict();

export const borderConfigSchema = z.object({
  width: z.number().nonnegative().optional(),
  style: z.enum(['none', 'solid', 'dashed', 'dotted']).optional(),
  color: colorValueSchema.optional(),
  radius: z.number().nonnegative().optional(),
}).strict();

export const shadowConfigSchema = z.object({
  preset: z.enum(['none', 'sm', 'md', 'lg', 'xl']).optional(),
  custom: z.object({
    x: z.number(),
    y: z.number(),
    blur: z.number().nonnegative(),
    spread: z.number().optional(),
    color: colorValueSchema,
    inset: z.boolean().optional(),
  }).strict().optional(),
}).strict();

export const sizeStyleSchema = z.object({
  height: z.union([z.number(), z.literal('auto')]).optional(),
  minHeight: z.number().optional(),
  maxHeight: z.number().optional(),
  width: z.union([z.number(), z.literal('auto'), z.literal('full')]).optional(),
  minWidth: z.number().optional(),
  maxWidth: z.number().optional(),
}).strict();

export const alignmentStyleSchema = z.object({
  self: z.enum(['start', 'center', 'end', 'stretch']).optional(),
  items: z.enum(['start', 'center', 'end', 'stretch']).optional(),
  justify: z.enum(['start', 'center', 'end', 'between', 'around', 'evenly']).optional(),
}).strict();

export const responsiveOverridesSchema = z.object({
  hiddenOn: z.array(breakpointSchema).optional(),
  order: z.record(breakpointSchema, z.number().int()).optional(),
}).strict();

export const blockStyleSchema = z.object({
  typography: typographyStyleSchema.optional(),
  spacing: spacingStyleSchema.optional(),
  background: backgroundStyleSchema.optional(),
  overlay: overlayStyleSchema.optional(),
  border: borderConfigSchema.optional(),
  shadow: shadowConfigSchema.optional(),
  size: sizeStyleSchema.optional(),
  alignment: alignmentStyleSchema.optional(),
  responsive: responsiveOverridesSchema.optional(),
}).strict();

export type ColorValue = z.infer<typeof colorValueSchema>;
export type BoxSides = z.infer<typeof boxSidesSchema>;
export type TypographyStyle = z.infer<typeof typographyStyleSchema>;
export type SpacingStyle = z.infer<typeof spacingStyleSchema>;
export type BackgroundStyle = z.infer<typeof backgroundStyleSchema>;
export type OverlayStyle = z.infer<typeof overlayStyleSchema>;
export type BorderConfig = z.infer<typeof borderConfigSchema>;
export type ShadowConfig = z.infer<typeof shadowConfigSchema>;
export type SizeStyle = z.infer<typeof sizeStyleSchema>;
export type AlignmentStyle = z.infer<typeof alignmentStyleSchema>;
export type ResponsiveOverrides = z.infer<typeof responsiveOverridesSchema>;
export type BlockStyle = z.infer<typeof blockStyleSchema>;
