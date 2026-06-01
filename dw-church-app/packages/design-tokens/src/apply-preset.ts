/**
 * Phase-2 helpers for applying a font-size or spacing preset onto a
 * DesignTokens snapshot. ThemeEditor exposes these as one-click pickers so
 * the operator doesn't have to dial 11 scales × 3 breakpoints by hand.
 *
 * The contract is intentionally non-destructive — both helpers return a
 * fresh object with the preset values overlaid on top of the input. Fields
 * the preset doesn't touch (lineHeight, weight, custom fontFamily) survive
 * untouched.
 */
import type { DesignTokens, TypographyScaleName, TypographyScaleSpec } from './schema.js';
import {
  FONT_SIZE_PRESETS,
  SPACING_PRESETS,
  type FontSizePresetName,
  type SpacingPresetName,
} from './defaults.js';

const PRESET_SCALES: ReadonlyArray<TypographyScaleName> = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'body', 'caption',
];

/**
 * Apply a 4-step density preset (compact/default/large/xlarge) to the
 * heading + body + caption scales. Tablet sizes are interpolated between
 * desktop and mobile (midpoint, rounded to int) so all 3 breakpoints stay
 * consistent without forcing the preset table to also list tablet values.
 */
export function applyFontSizePreset(
  tokens: DesignTokens,
  preset: FontSizePresetName,
): DesignTokens {
  const sizes = FONT_SIZE_PRESETS[preset];
  const scales: Record<TypographyScaleName, TypographyScaleSpec> = {
    ...tokens.typography.scales,
  } as Record<TypographyScaleName, TypographyScaleSpec>;

  for (const name of PRESET_SCALES) {
    const cur = scales[name];
    const target = sizes[name as keyof typeof sizes];
    if (!cur || !target) continue;
    const tablet = Math.round((target.desktop + target.mobile) / 2);
    scales[name] = {
      ...cur,
      size: { desktop: target.desktop, tablet, mobile: target.mobile },
    };
  }

  // overline / label / button stay where they are — those are utility
  // scales whose px values shouldn't move with a "make headings bigger"
  // density flip. Operators tweak them by hand if needed.

  return {
    ...tokens,
    typography: {
      ...tokens.typography,
      scales,
    },
  };
}

/**
 * Apply a spacing density preset to a tokens snapshot. Touches only the
 * `spacing` block (sectionPaddingY / containerPaddingX / gapGrid).
 */
export function applySpacingPreset(
  tokens: DesignTokens,
  preset: SpacingPresetName,
): DesignTokens {
  return {
    ...tokens,
    spacing: { ...SPACING_PRESETS[preset] },
  };
}

/**
 * Best-effort detection: which font-size preset (if any) does the tokens
 * snapshot match? Used by the ThemeEditor to highlight the active radio
 * without persisting a "selected preset" name. Returns null when the
 * sizes don't exactly match any known preset.
 */
export function detectFontSizePreset(tokens: DesignTokens): FontSizePresetName | null {
  for (const name of Object.keys(FONT_SIZE_PRESETS) as FontSizePresetName[]) {
    const sizes = FONT_SIZE_PRESETS[name];
    let match = true;
    for (const scale of PRESET_SCALES) {
      const cur = tokens.typography.scales[scale];
      const target = sizes[scale as keyof typeof sizes];
      if (!cur || !target) { match = false; break; }
      if (cur.size.desktop !== target.desktop || cur.size.mobile !== target.mobile) {
        match = false; break;
      }
    }
    if (match) return name;
  }
  return null;
}

export function detectSpacingPreset(tokens: DesignTokens): SpacingPresetName | null {
  for (const name of Object.keys(SPACING_PRESETS) as SpacingPresetName[]) {
    const target = SPACING_PRESETS[name];
    if (
      tokens.spacing.sectionPaddingY === target.sectionPaddingY &&
      tokens.spacing.containerPaddingX === target.containerPaddingX &&
      tokens.spacing.gapGrid === target.gapGrid
    ) {
      return name;
    }
  }
  return null;
}
