/**
 * BorderField — Border editor in the inspector.
 *
 * Mirrors Elementor's Border panel: Border Type (none / solid / dashed
 * / dotted / double / groove), Width, Color, and a 4-side Border Radius
 * with a link toggle so the operator can lock the four corners to one
 * value. Box Shadow stays in a sibling field (BoxShadowField) so each
 * piece stays focused.
 *
 * Storage shape — every input is a separate top-level prop on the
 * section bag so the registry-driven FieldControl flow can wire each
 * one independently (same convention as OverlayField):
 *
 *   borderType:        'none' | 'solid' | 'dashed' | 'dotted' | 'double' | 'groove'
 *   borderWidth:       number (px)
 *   borderColor:       string (hex / palette key)
 *   borderRadiusTop:   number (px)
 *   borderRadiusRight: number (px)
 *   borderRadiusBottom:number (px)
 *   borderRadiusLeft:  number (px)
 *
 * The matching SectionBackground / block-wrapper read maps these into
 * the CSS `border` / `border-radius` shorthand at render.
 */

import { useState } from 'react';
import { ColorField } from './ColorField';
import { LabeledField } from './LabeledField';

export type BorderType = 'none' | 'default' | 'solid' | 'dashed' | 'dotted' | 'double' | 'groove';

export interface BorderFieldValue {
  borderType?: BorderType;
  borderWidth?: number;
  borderColor?: string;
  borderRadiusTop?: number;
  borderRadiusRight?: number;
  borderRadiusBottom?: number;
  borderRadiusLeft?: number;
}

export interface BorderFieldProps {
  /** Current border values from the section's props bag. Any field can
   *  be undefined — sensible defaults apply at render. */
  value: BorderFieldValue;
  /** Receives a single-field patch the caller merges into its props /
   *  pendingPatch. Caller decides whether to drop the width/color fields
   *  when borderType reverts to 'none' / 'default'. */
  onChange: (patch: Partial<BorderFieldValue>) => void;
  /** Theme palette swatches for ColorField. */
  palette?: Array<{ key: string; label?: string; hex: string }>;
}

const BORDER_TYPE_OPTIONS: Array<{ value: BorderType; label: string }> = [
  { value: 'default', label: 'Default (none)' },
  { value: 'solid',   label: 'Solid' },
  { value: 'dashed',  label: 'Dashed' },
  { value: 'dotted',  label: 'Dotted' },
  { value: 'double',  label: 'Double' },
  { value: 'groove',  label: 'Groove' },
];

/**
 * 4-side numeric editor for border-radius. Bundles a "link" toggle so
 * the operator can lock the four corners to the same value (the
 * default) or unlock to set each independently. Same affordance the
 * BoxSidesField (margin / padding) uses — kept inline here because the
 * underlying storage is 4 separate top-level props, not a BoxSides
 * object, so reusing BoxSidesField would require an adapter shim.
 */
function RadiusSidesEditor({ value, onChange }: {
  value: BorderFieldValue;
  onChange: (patch: Partial<BorderFieldValue>) => void;
}) {
  const sides = [
    { key: 'borderRadiusTop' as const,    label: 'Top' },
    { key: 'borderRadiusRight' as const,  label: 'Right' },
    { key: 'borderRadiusBottom' as const, label: 'Bottom' },
    { key: 'borderRadiusLeft' as const,   label: 'Left' },
  ];

  const currentValues = sides.map((s) => value[s.key]);
  const allEqual =
    currentValues[0] !== undefined &&
    currentValues.every((v) => v === currentValues[0]);
  const [linked, setLinked] = useState(allEqual);

  const setSide = (key: keyof BorderFieldValue, raw: string) => {
    const trimmed = raw.trim().replace(/px$/i, '');
    const parsed = trimmed === '' ? undefined : Number(trimmed);
    const next = parsed !== undefined && !Number.isFinite(parsed) ? undefined : parsed;
    if (linked) {
      onChange({
        borderRadiusTop: next,
        borderRadiusRight: next,
        borderRadiusBottom: next,
        borderRadiusLeft: next,
      });
    } else {
      onChange({ [key]: next } as Partial<BorderFieldValue>);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-medium text-gray-600">Border Radius</span>
        <button
          type="button"
          onClick={() => setLinked((v) => !v)}
          title={linked ? 'Edit each corner separately' : 'Lock all four corners to the same value'}
          className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
            linked
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
          }`}
        >
          {linked ? '🔗 Linked' : '⛓️‍💥 Unlinked'}
        </button>
      </div>
      {linked ? (
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400 w-3 text-center" title="All corners">↔</span>
          <input
            type="text"
            inputMode="numeric"
            value={value.borderRadiusTop === undefined ? '' : String(value.borderRadiusTop)}
            onChange={(e) => setSide('borderRadiusTop', e.target.value)}
            placeholder="px"
            className="flex-1 text-xs font-mono border border-gray-300 rounded px-1.5 py-1 focus:border-blue-500 outline-none"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          {sides.map((s) => (
            <div key={s.key} className="flex items-center gap-1">
              <span className="text-xs text-gray-400 w-10 text-right" title={s.label}>{s.label}</span>
              <input
                type="text"
                inputMode="numeric"
                value={value[s.key] === undefined ? '' : String(value[s.key])}
                onChange={(e) => setSide(s.key, e.target.value)}
                placeholder="px"
                className="flex-1 text-xs font-mono border border-gray-300 rounded px-1.5 py-1 focus:border-blue-500 outline-none"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function BorderField({ value, onChange, palette }: BorderFieldProps) {
  const borderType: BorderType = value.borderType ?? 'default';
  const showBorderControls = borderType !== 'default' && borderType !== 'none';

  return (
    <div className="space-y-3">
      <LabeledField label="Border Type">
        <select
          value={borderType}
          onChange={(e) => onChange({ borderType: e.target.value as BorderType })}
          className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white focus:border-blue-500 outline-none"
        >
          {BORDER_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </LabeledField>

      {showBorderControls && (
        <>
          <LabeledField label="Border Width (px)">
            <input
              type="number"
              min={0}
              step={1}
              value={value.borderWidth ?? ''}
              onChange={(e) => onChange({ borderWidth: e.target.value === '' ? undefined : Number(e.target.value) })}
              className="w-full text-xs font-mono border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none"
            />
          </LabeledField>
          <LabeledField label="Border Color">
            <ColorField
              value={value.borderColor ?? ''}
              onChange={(next) => onChange({ borderColor: next })}
              palette={palette}
            />
          </LabeledField>
        </>
      )}

      <RadiusSidesEditor value={value} onChange={onChange} />
    </div>
  );
}
