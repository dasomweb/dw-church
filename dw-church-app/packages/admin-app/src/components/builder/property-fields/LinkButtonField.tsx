/**
 * LinkButtonField — Button label + URL + "open in new tab" packaged
 * as a single inspector control.
 *
 * Operator mental model in B2B Smart: a CTA button is *one thing*. The
 * old layout split label / URL / new-tab into 3 separate inspector
 * elements, so clicking the button in the canvas focused only the
 * label field — operators couldn't see "where does this button go?"
 * without expanding the full registry view.
 *
 * Wraps the existing LinkField for the URL slot (page picker / external
 * URL / anchor — same vocab everywhere). Storage stays as flat top-level
 * props on the section bag so the registry-driven FieldControl flow can
 * keep its 1-key-per-spec invariant; the inspector translates between
 * this object shape and the flat keys at the boundary.
 *
 *   propsBag.{prefix}Text     → label
 *   propsBag.{prefix}Url      → url
 *   propsBag.{prefix}NewTab   → newTab  (boolean, defaults to false)
 *
 * Where prefix is set by the registry spec.path — e.g. 'button' for the
 * primary CTA, 'secondaryButton' for the secondary slot. Storefront
 * blocks read the same flat keys with a `target="_blank" rel="noopener
 * noreferrer"` guard when newTab is true.
 */

import { LabeledField } from './LabeledField';
import { LinkField } from './LinkField';

export interface LinkButtonFieldValue {
  label?: string;
  url?: string;
  newTab?: boolean;
}

export interface LinkButtonFieldProps {
  value: LinkButtonFieldValue;
  /** Receives a single-field patch; caller maps to the flat prop names
   *  (buttonText / buttonUrl / buttonNewTab — see ElementInspector's
   *  adaptLinkButtonPatch). */
  onChange: (patch: Partial<LinkButtonFieldValue>) => void;
  /** Hint shown under the Label input — e.g. "Optional" so operators
   *  know an empty CTA is fine. */
  labelHint?: string;
}

export function LinkButtonField({ value, onChange, labelHint }: LinkButtonFieldProps) {
  return (
    <div className="space-y-3">
      <LabeledField label="Button Label" hint={labelHint}>
        <input
          type="text"
          value={value.label ?? ''}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Contact Sales"
          className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none"
        />
      </LabeledField>

      <LabeledField label="Button URL" hint="내부 페이지 / 외부 URL / 같은 페이지 anchor 중 선택">
        <LinkField
          value={value.url ?? ''}
          onChange={(next) => onChange({ url: next })}
        />
      </LabeledField>

      <LabeledField label="Behavior">
        <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={value.newTab ?? false}
            onChange={(e) => onChange({ newTab: e.target.checked })}
            className="h-3.5 w-3.5"
          />
          <span>새 창으로 열기 (target="_blank")</span>
        </label>
        <p className="mt-1 text-[10px] text-gray-500 leading-snug">
          외부 URL 이거나 운영자가 현재 페이지를 떠나지 않게 하고 싶을 때 체크.
          자동으로 <code>rel="noopener noreferrer"</code> 가 함께 적용됩니다.
        </p>
      </LabeledField>
    </div>
  );
}
