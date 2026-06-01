/**
 * Operator-facing labels for design-token preset pickers.
 *
 * Why a separate file
 *   `schema.ts` defines the runtime Zod schema + TypeScript types — those
 *   exist for validation/typecheck and never leak into the UI. The UI on
 *   the other hand needs friendly labels ("H1 · Display") that an operator
 *   reads in the inspector or ThemeEditor. Keeping the labels here means:
 *     - the schema stays pure (no UI concerns leaking in),
 *     - the labels are a single source of truth — adding a new typography
 *       scale anywhere now only needs schema entry + a row here, and
 *       every consumer (ElementInspector / ThemeEditor / Planner) picks
 *       the same label,
 *     - consumers `import { TYPOGRAPHY_SCALE_LABELS } from
 *       '@dw-church/design-tokens'` so the workspace package owns the
 *       vocabulary.
 *
 * Phase plan
 *   Phase C-1 (this file): typography + shadow + radius labels.
 *   Phase C-2: ThemeEditor's BrandingEditor / PresetEditor / TypographyEditor
 *     migrate to these constants so the ThemeEditor's typography preset
 *     dropdown shows the SAME label set as the inspector.
 *   Phase D: a TokenSelector component that takes (tokenGroup, value,
 *     onChange) and renders the right select with the right labels —
 *     replaces the hand-rolled <select> in every inspector control.
 */

import type { TypographyScaleName } from './schema.js';

/**
 * Inspector / ThemeEditor labels for the 11 typography scale tokens.
 * Keep in sync with `typographyScaleNames` in schema.ts — TS will flag
 * any drift via the Record<TypographyScaleName, string> constraint.
 *
 * Suffix convention:
 *   "·" separator + role hint, used only for headings that double as
 *   layout primitives (h1=display, h2=section title, h3=subtitle). The
 *   rest are bare names because their role is the name itself.
 */
export const TYPOGRAPHY_SCALE_LABELS: Record<TypographyScaleName, string> = {
  h1:        'H1 · Display',
  h2:        'H2 · Section Title',
  h3:        'H3 · Subtitle',
  h4:        'H4',
  h5:        'H5',
  h6:        'H6',
  body:      'Body',
  caption:   'Caption',
  overline:  'Overline',
  label:     'Label',
  button:    'Button',
};

/** Shadow preset labels — matches `shadowPresetSchema` in schema.ts. */
export const SHADOW_PRESET_LABELS = {
  sm: 'Small',
  md: 'Medium',
  lg: 'Large',
  xl: 'X-Large',
} as const;

/** Radius preset labels — matches `designTokenRadiusSchema` keys. */
export const RADIUS_PRESET_LABELS = {
  sm:   'Small',
  md:   'Medium',
  lg:   'Large',
  full: 'Pill / Full',
} as const;

/**
 * Curated font-family list the ThemeEditor offers to the operator.
 *
 * Why curated, not free-text:
 *   The operator picks from a known-good set so the storefront is
 *   guaranteed to have the webfont loaded (the GoogleFonts loader in
 *   apps/web only ships these families). Free-text input is silent
 *   failure: an arbitrary family name yields system fallback at render.
 *
 * Order: Pretendard Variable first (most recommended for B2B Korean
 *   sites — variable-weight axis, broad coverage). Then Korean sans
 *   options, then Korean serif, then English sans + serif.
 *
 * Consumers (4 places before this consolidation):
 *   - apps/admin pages/builder/ThemeEditor.tsx
 *   - components/theme/TypographyEditor.tsx
 *   - components/theme/HeaderEditor.tsx
 *   - components/theme/FooterEditor.tsx
 * All four had drifted: HeaderEditor/FooterEditor lacked Nanum / Black
 * Han Sans / Do Hyeon / Playfair / Merriweather; TypographyEditor had
 * Pretendard Variable. Single source here resolves it.
 *
 * Callers prepend their own placeholder entry ("" or "(Theme default)")
 * when relevant — keeping the list itself sentinel-free.
 */
export const FONT_FAMILY_OPTIONS = [
  // Korean — sans, Pretendard family first (recommended)
  'Pretendard Variable',
  'Pretendard',
  // Korean — sans, alternates
  'Noto Sans KR',
  'IBM Plex Sans KR',
  'Spoqa Han Sans Neo',
  'Gothic A1',
  'Nanum Gothic',
  // Korean — serif
  'Noto Serif KR',
  'Nanum Myeongjo',
  // Korean — display
  'Black Han Sans',
  'Do Hyeon',
  // English — sans
  'Inter',
  'Roboto',
  // English — serif / display
  'Playfair Display',
  'Merriweather',
] as const;

export type FontFamilyOption = typeof FONT_FAMILY_OPTIONS[number];
