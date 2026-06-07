/**
 * TokenSelectField — the final piece of Step D. Every design-token
 * preset picker (typography scale / shadow preset / radius preset /
 * font family) collapses into one component that takes:
 *
 *   - `tokenGroup`: which token enum is being picked
 *   - `value`: current selection (or undefined when nothing is set)
 *   - `onChange`: receives the next selection (or undefined when the
 *                 operator picks "— None")
 *
 * The component reads the canonical option list + UI labels straight
 * from `@dw-church/design-tokens` so adding a new typography scale (or
 * renaming "X-Large" → "Huge") propagates everywhere in one edit.
 *
 * Why this layer exists
 *   Steps A through C-2 collapsed the per-field call sites down to
 *   LabeledField + a hand-rolled `<select>` per token group. The
 *   hand-rolled <select> still duplicated the same recipe in 4-5
 *   places (option map + sentinels + custom-value escape). This
 *   component eats that recipe — every preset picker now reads
 *   "give me a select for shadow tokens" instead of laying out the
 *   options inline.
 *
 *   The token-aware variant of typography also writes the full
 *   `var(--brand-{name})` CSS variable form on change (the same
 *   convention the inspector's ElementInspector typography picker
 *   used) so callers don't have to remember to wrap. Shadow / radius
 *   write the raw key ('sm' / 'md' / …) — those are typed BlockStyle
 *   field values, not CSS vars.
 *
 *   The font-family group treats values as plain strings (no `var()`),
 *   matching the existing FONT_FAMILY_OPTIONS contract.
 */

import {
  typographyScaleNames,
  TYPOGRAPHY_SCALE_LABELS,
  SHADOW_PRESET_LABELS,
  RADIUS_PRESET_LABELS,
  FONT_FAMILY_OPTIONS,
  type TypographyScaleName,
} from '@dw-church/design-tokens';
import { LabeledField } from './LabeledField';

/** Token group identifiers — each maps to one of the design-token
 *  preset sets exported from `@dw-church/design-tokens`. */
export type TokenGroup =
  | 'typography'   // h1 / h2 / h3 / h4 / h5 / h6 / body / caption / overline / label / button
  | 'shadow'       // sm / md / lg / xl  (+ 'none' explicit no-shadow)
  | 'radius'       // sm / md / lg / full
  | 'font-family'; // curated 15-option list

/** Shape returned for the rendered <option>s. The `value` is what
 *  TokenSelectField writes via onChange — already in the format the
 *  underlying schema expects (var() string for typography, raw key
 *  for shadow / radius, plain family name for font-family). */
interface TokenOption {
  value: string;
  label: string;
}

/** Resolve the option list + per-group conventions for the chosen
 *  TokenGroup. Single switch so future groups (animation / breakpoint /
 *  spacing density / …) land in one place. */
function optionsFor(group: TokenGroup): TokenOption[] {
  switch (group) {
    case 'typography':
      return typographyScaleNames.map((name) => ({
        value: `var(--brand-${name})`,
        label: TYPOGRAPHY_SCALE_LABELS[name as TypographyScaleName],
      }));
    case 'shadow':
      return [
        { value: 'none', label: 'No shadow' },
        ...Object.entries(SHADOW_PRESET_LABELS).map(([key, label]) => ({
          value: key,
          label: label as string,
        })),
      ];
    case 'radius':
      return Object.entries(RADIUS_PRESET_LABELS).map(([key, label]) => ({
        value: key,
        label: label as string,
      }));
    case 'font-family':
      return FONT_FAMILY_OPTIONS.map((family) => ({
        value: family,
        label: family,
      }));
  }
}

export interface TokenSelectFieldProps {
  /** Which design-token group to pick from. */
  tokenGroup: TokenGroup;
  /** Operator-facing label rendered above the select via LabeledField. */
  label: string;
  /** Inline hint under the control. */
  hint?: string;
  /** Currently-picked option value. Pass empty string or undefined to
   *  show the "— None" sentinel selected. */
  value: string | undefined;
  /**
   * Receives the next value, or undefined when the operator picks the
   * "— None" sentinel. Caller is responsible for converting undefined
   * back into the right "no override" shape (delete key from override
   * object, etc.).
   */
  onChange: (next: string | undefined) => void;
  /** Optional override for the "— None" sentinel label (e.g. for
   *  font-family inside ThemeEditor it reads "(Theme default)"). */
  nonePlaceholder?: string;
  /** Skip the sentinel "— None" row entirely — useful when the caller
   *  wants the picker to always have a value selected (e.g. when the
   *  schema requires it). */
  required?: boolean;
}

/**
 * Dropdown-only token picker. Composes LabeledField + a single <select>
 * driven by the design-tokens option list — no caller-side `.map()`.
 *
 * The hand-rolled selects in BlockStyleInspector (shadow / radius) and
 * ElementInspector (typography) collapse to one line each:
 *
 *   <TokenSelectField tokenGroup="shadow" label="Shadow" value={…} onChange={…} />
 */
export function TokenSelectField({
  tokenGroup,
  label,
  hint,
  value,
  onChange,
  nonePlaceholder = '— None',
  required = false,
}: TokenSelectFieldProps) {
  const options = optionsFor(tokenGroup);
  // Empty string is the canonical "no selection" wire value for native
  // <select>. We translate it back to undefined when bubbling out so
  // callers always see undefined for "nothing picked".
  const handleChange = (raw: string) => {
    if (raw === '') {
      onChange(undefined);
    } else {
      onChange(raw);
    }
  };
  // If the value isn't in the option list (operator hand-typed a custom
  // value via another control), append a non-canonical "Custom" row so
  // the select can pin to it without resetting the value silently.
  const hasMatchingOption = value !== undefined && options.some((o) => o.value === value);
  const showCustomRow = value !== undefined && value !== '' && !hasMatchingOption;

  return (
    <LabeledField label={label} hint={hint}>
      <select
        value={value ?? ''}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white focus:border-blue-500 outline-none"
      >
        {!required && <option value="">{nonePlaceholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        {showCustomRow && (
          <option value={value}>Custom ({value})</option>
        )}
      </select>
    </LabeledField>
  );
}
