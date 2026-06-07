/**
 * TypographyTokenField — the typography-preset master picker.
 *
 * The original ElementInspector `TextStyleControls` opened with an
 * 80-line block that wove together (1) a token <select>, (2) a free-text
 * fontSize input, (3) a weight <select>, (4) letter-spacing input,
 * (5) line-height input. All five controls are tied to the same
 * "what's the current typography mode" state — token-driven /
 * operator-Custom / block-default-falls-through — and writing one of
 * them in the wrong order trips the stale-closure bug that bit us
 * earlier (commit 94da7e0).
 *
 * Folding the whole block into one component means:
 *   1. The 4-field `setMany` patch + selectValue derivation lives in
 *      ONE place. Future stale-closure / preset-flip bugs land here.
 *   2. The single-source of typography preset options
 *      (`typographyScaleNames` + `TYPOGRAPHY_SCALE_LABELS`) imports
 *      ONLY here — adding a new scale needs a schema edit + a labels
 *      edit, and every consumer (this inspector field + the TokenSelectField
 *      shadow/radius picker etc) updates from the design-tokens
 *      package automatically.
 *   3. The component is the natural seam for the `data-default-size`
 *      logic (Step-1 inspector bug fix from 065388e) — when the
 *      operator hasn't set an override, the block-author's defaultSize
 *      stamped on the rendered element flows back into the select.
 *
 * Caller responsibility is reduced to:
 *   - hand over `value` (operator's elementStyles[key] override blob),
 *   - hand over `applied` (the browser-computed style read via
 *     useAppliedStyle including data-default-size),
 *   - receive a patch from `onChange` and merge into elementStyles via
 *     setMany.
 *
 * No more inline `applyTypographyToken` recipe — the caller just drives
 * the patch downstream.
 */

import {
  typographyScaleNames,
  TYPOGRAPHY_SCALE_LABELS,
} from '@dw-church/design-tokens';
import { LabeledField } from './LabeledField';

/** Subset of ElementStyle the component reads / writes. Defining it
 *  inline avoids a hard import of the blocks package from the
 *  property-fields layer — keeps this component dependency-light. */
export interface TypographyOverride {
  fontSize?: string;
  fontWeight?: string;
  letterSpacing?: string;
  lineHeight?: string;
}

export interface TypographyAppliedStyle {
  /** DOM-resolved fontSize from getComputedStyle. */
  fontSize?: string;
  fontWeight?: string;
  letterSpacing?: string;
  lineHeight?: string;
  /** The block author's `data-default-size` attr (e.g. 'h2', 'body').
   *  When the operator hasn't set an override, this token surfaces in
   *  the select as the "currently active" preset — without it the
   *  resolved px ("36px") would be misclassified as Custom. */
  defaultSize?: string;
}

/** Recognised numeric font weights — same vocabulary the inspector
 *  has always offered (no Light/Hair etc). Empty string sentinel for
 *  "no override". */
const FONT_WEIGHTS = ['', '300', '400', '500', '600', '700', '800', '900'] as const;

export interface TypographyTokenFieldProps {
  /** Operator's elementStyles[key] override blob, narrowed to the 4
   *  typography fields. Pass an empty object when nothing is set. */
  value: TypographyOverride;
  /** DOM-resolved style + block author's defaultSize attribute. */
  applied?: TypographyAppliedStyle;
  /**
   * Receives a patch of the 4 typography fields. Caller merges the
   * patch into elementStyles via setMany (so React only commits one
   * state update — the stale-closure bug that bit set()×4 doesn't
   * recur).
   */
  onChange: (patch: TypographyOverride) => void;
}

export function TypographyTokenField({ value, applied, onChange }: TypographyTokenFieldProps) {
  // Effective values — what each input/select shows. Operator override
  // wins; when nothing is set we pull the resolved DOM value so the
  // operator literally sees what's rendering. Letter / line normalise
  // 'normal' to blank so the placeholder shows instead of "normal".
  const effectiveFontSize = value.fontSize ?? applied?.fontSize ?? '';
  const effectiveFontWeight = value.fontWeight ?? applied?.fontWeight ?? '';
  const effectiveLetterSpacing =
    value.letterSpacing ??
    (applied?.letterSpacing && applied.letterSpacing !== 'normal' ? applied.letterSpacing : '');
  const effectiveLineHeight =
    value.lineHeight ??
    (applied?.lineHeight && applied.lineHeight !== 'normal' ? applied.lineHeight : '');

  // Token / Custom / Default state derivation. ONLY the operator's
  // explicit override drives the mode — DOM resolved px never makes
  // the select read "Custom" by accident (065388e bug fix).
  const draftFontSize = value.fontSize ?? '';
  const isToken = draftFontSize.startsWith('var(--brand-');
  const isCustomMode = !isToken && draftFontSize.trim() !== '';
  const editable = isCustomMode;
  const usingDefault = !draftFontSize.trim() && Boolean(applied?.defaultSize);

  const selectValue = isToken
    ? draftFontSize
    : isCustomMode
      ? '__custom__'
      : usingDefault
        ? `var(--brand-${applied!.defaultSize})`
        : '';

  // Normalise to a recognised weight option; DOM returns numeric
  // strings but a stray 'bold'/'normal' could land here.
  const weightOptionValue = (FONT_WEIGHTS as readonly string[]).includes(effectiveFontWeight)
    ? effectiveFontWeight
    : '';

  /**
   * Token-mode change: patch all four fields in one shot so React only
   * commits one state update. set() chained four times tripped a stale
   * closure (94da7e0) — onChange's setMany is the canonical path.
   */
  const applyTypographyToken = (tokenValue: string) => {
    if (tokenValue === '') {
      // Clear all four fields — block code default takes over.
      onChange({
        fontSize: undefined,
        fontWeight: undefined,
        letterSpacing: undefined,
        lineHeight: undefined,
      });
    } else if (tokenValue === '__custom__') {
      // Operator entering Custom mode — prefill the four fields with
      // the currently-resolved values so they have something to tweak
      // (empty inputs are worse for "where do I start" UX).
      onChange({
        fontSize: applied?.fontSize ?? '',
        fontWeight:
          applied?.fontWeight && applied.fontWeight !== 'normal' ? applied.fontWeight : undefined,
        letterSpacing:
          applied?.letterSpacing && applied.letterSpacing !== 'normal'
            ? applied.letterSpacing
            : undefined,
        lineHeight:
          applied?.lineHeight && applied.lineHeight !== 'normal' ? applied.lineHeight : undefined,
      });
    } else {
      // Token selection — write the var(--brand-{name}-*) family for
      // all four properties at once.
      const m = tokenValue.match(/var\(--brand-([^)]+)\)/);
      const name = m ? m[1] : '';
      if (!name) return;
      onChange({
        fontSize: `var(--brand-${name})`,
        fontWeight: `var(--brand-${name}-weight)`,
        letterSpacing: `var(--brand-${name}-letter-spacing)`,
        lineHeight: `var(--brand-${name}-line-height)`,
      });
    }
  };

  // Display values — same logic as the original ElementInspector. In
  // Custom mode the operator's override drives; otherwise the DOM-
  // resolved value shows (read-only mirror).
  const sizeDisplay = editable ? effectiveFontSize : (applied?.fontSize ?? '');
  const weightDisplay = editable ? weightOptionValue : (applied?.fontWeight ?? '');
  const letterDisplay = editable
    ? effectiveLetterSpacing
    : applied?.letterSpacing && applied.letterSpacing !== 'normal'
      ? applied.letterSpacing
      : '';
  const lineDisplay = editable
    ? effectiveLineHeight
    : applied?.lineHeight && applied.lineHeight !== 'normal'
      ? applied.lineHeight
      : '';

  // Single-field setters for Custom-mode editing. Each writes only one
  // field — the other three remain whatever the operator already had.
  const setOne = (field: keyof TypographyOverride, next: string) => {
    onChange({ [field]: next });
  };

  return (
    <>
      <LabeledField label="Font Size">
        <div className="flex gap-1">
          <select
            value={selectValue}
            onChange={(e) => applyTypographyToken(e.target.value)}
            className="flex-1 min-w-0 text-xs border border-gray-300 rounded px-2 py-1.5 bg-white"
            title="Theme font system token. Choose Custom for a raw value."
          >
            <option value="">— None</option>
            {typographyScaleNames.map((name) => (
              <option key={name} value={`var(--brand-${name})`}>
                {TYPOGRAPHY_SCALE_LABELS[name]}
              </option>
            ))}
            <option value="__custom__">Custom</option>
          </select>
          <input
            type="text"
            value={sizeDisplay}
            onChange={editable ? (e) => setOne('fontSize', e.target.value) : undefined}
            disabled={!editable}
            placeholder={editable ? '16px / 1.25rem' : ''}
            className={`w-24 shrink-0 text-xs border border-gray-300 rounded px-2 py-1.5 outline-none font-mono ${
              editable
                ? 'bg-white focus:border-blue-500 placeholder:text-gray-400'
                : 'bg-gray-50 text-gray-500 cursor-not-allowed'
            }`}
            title={editable ? 'Custom value' : 'Resolved from token — select Custom to edit'}
          />
        </div>
      </LabeledField>

      {/* Font weight — disabled (read-only mirror) in token mode, editable
          in Custom mode. */}
      <LabeledField label="Weight">
        <select
          value={weightDisplay}
          onChange={editable ? (e) => setOne('fontWeight', e.target.value) : undefined}
          disabled={!editable}
          className={`w-full text-xs border border-gray-300 rounded px-2 py-1.5 ${
            editable ? 'bg-white' : 'bg-gray-50 text-gray-500 cursor-not-allowed'
          }`}
          title={editable ? 'Custom value' : 'Resolved from token — select Custom to edit'}
        >
          {FONT_WEIGHTS.map((w) => (
            <option key={w} value={w}>
              {w === '' ? '—' : `${w}${w === '400' ? ' (Regular)' : w === '700' ? ' (Bold)' : ''}`}
            </option>
          ))}
          {/* applied 가 FONT_WEIGHTS 에 없는 임의 numeric 값일 때
              select 가 빈 표시 안 되도록 fallback option 추가 */}
          {!editable && weightDisplay && !(FONT_WEIGHTS as readonly string[]).includes(weightDisplay) && (
            <option value={weightDisplay}>{weightDisplay}</option>
          )}
        </select>
      </LabeledField>

      {/* Letter spacing + line height — same editable rule as weight */}
      <div className="grid grid-cols-2 gap-2">
        <LabeledField label="Letter Spacing">
          <input
            type="text"
            value={letterDisplay}
            onChange={editable ? (e) => setOne('letterSpacing', e.target.value) : undefined}
            disabled={!editable}
            placeholder={editable ? '0 / -0.02em' : ''}
            className={`w-full text-xs border border-gray-300 rounded px-2 py-1.5 outline-none font-mono ${
              editable
                ? 'bg-white focus:border-blue-500 placeholder:text-gray-400'
                : 'bg-gray-50 text-gray-500 cursor-not-allowed'
            }`}
            title={editable ? 'Custom value' : 'Resolved from token — select Custom to edit'}
          />
        </LabeledField>
        <LabeledField label="Line Height">
          <input
            type="text"
            value={lineDisplay}
            onChange={editable ? (e) => setOne('lineHeight', e.target.value) : undefined}
            disabled={!editable}
            placeholder={editable ? '1.5 / 1.2' : ''}
            className={`w-full text-xs border border-gray-300 rounded px-2 py-1.5 outline-none font-mono ${
              editable
                ? 'bg-white focus:border-blue-500 placeholder:text-gray-400'
                : 'bg-gray-50 text-gray-500 cursor-not-allowed'
            }`}
            title={editable ? 'Custom value' : 'Resolved from token — select Custom to edit'}
          />
        </LabeledField>
      </div>
    </>
  );
}
