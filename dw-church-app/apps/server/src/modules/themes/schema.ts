import { z } from 'zod';

export const templateNames = [
  'modern',
  'classic',
  'minimal',
  'warm',
  'formal',
  'dark',
  'visual',
  'simple',
  'traditional',
  'youth',
] as const;

export type TemplateName = (typeof templateNames)[number];

// Phase 11-A2 (2026-06-02): extended to accept the full DesignTokens-
// shaped color slots (muted/border) and typography/tokensV2 inputs that
// the AI builder's applyDesignToTheme path produces. Loose enough to
// not break the existing tenant-admin form which only sends the
// original 6 slots.
export const colorsSchema = z.object({
  primary: z.string().optional(),
  secondary: z.string().optional(),
  accent: z.string().optional(),
  background: z.string().optional(),
  surface: z.string().optional(),
  text: z.string().optional(),
  muted: z.string().optional(),
  border: z.string().optional(),
});

export const fontsSchema = z.object({
  heading: z.string().optional(),
  body: z.string().optional(),
  koreanFont: z.string().optional(),
});

// Typography per-scale shape: { fontFamily?, color?, fontSize?, mobile? }
// matches the loose b2bsmart format the AI builder emits. Stored under
// settings.typography for tenant-admin's legacy editor to read.
export const typographyLevelSchema = z
  .object({
    fontFamily: z.string().optional(),
    color: z.string().optional(),
    fontSize: z.string().optional(),
    mobile: z.object({ fontSize: z.string().optional() }).partial().optional(),
  })
  .partial();

export const typographySchema = z.record(z.string(), typographyLevelSchema);

export const updateThemeSchema = z.object({
  templateName: z.enum(templateNames).optional(),
  colors: colorsSchema.optional(),
  fonts: fontsSchema.optional(),
  customCss: z.string().max(50000).optional(),
  typography: typographySchema.optional(),
  // Full DesignTokens snapshot — populated by AI builder /
  // applyDesignToTheme. Read through legacyThemeToTokens() projection,
  // so storing it here also drives /theme/tokens GET. Loose unknown to
  // avoid coupling to the @dw-church/design-tokens shape at this layer
  // (themes service casts before persistence).
  tokensV2: z.unknown().optional(),
});

export type UpdateThemeInput = z.infer<typeof updateThemeSchema>;
