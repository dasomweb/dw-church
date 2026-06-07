/**
 * OverlayField — Background Overlay editor in the inspector.
 *
 * Mirrors Elementor's Background Overlay panel: Classic mode (single
 * colour) and Gradient mode (two colour stops + locations + linear /
 * radial type + angle), with a shared Opacity slider that applies to
 * either mode.
 *
 * Storage shape — every input is a separate top-level prop on the
 * section so the registry-driven FieldControl flow can wire each one
 * without nested-object knowledge:
 *
 *   overlayMode:           'classic' | 'gradient'
 *   overlayOpacity:        0-100
 *   overlayColor:          string  (classic single colour)
 *   overlayColor1:         string  (gradient first stop)
 *   overlayLocation1:      0-100   (% along the gradient)
 *   overlayColor2:         string  (gradient second stop)
 *   overlayLocation2:      0-100
 *   overlayGradientType:   'linear' | 'radial'
 *   overlayAngle:          0-360   (linear gradient angle, deg)
 *
 * The matching SectionBackground reader (`readOverlayProps` in
 * HeroBannerBlock etc.) maps these props into an OverlayConfig and
 * `buildOverlayStyle` renders the actual CSS.
 *
 * Hosted inside CollapsibleGroup so it can sit alongside other Style-
 * tab panels (Border / Box Shadow etc.) without bullying them.
 */

import type { CSSProperties } from 'react';
import { ColorWithOpacity } from './ColorField';
import { LabeledField } from './LabeledField';

export interface OverlayFieldValue {
  mode?: 'classic' | 'gradient';
  /** @deprecated 단일 Opacity 슬라이더 폐기 — 각 stop 의 alpha 가
   *  ColorWithOpacity 안에 rgba(...) 로 같이 들어감 (Elementor 방식).
   *  storefront reader 가 backward compat 으로 hex+opacity 패턴은 여전히
   *  rgba 로 합쳐 읽음. */
  opacity?: number;
  /** rgba(r,g,b,a) 형식 — ColorWithOpacity 가 출력. hex 도 backward
   *  compat 으로 허용 (기존 데이터). */
  color?: string;
  color1?: string;
  location1?: number;
  color2?: string;
  location2?: number;
  gradientType?: 'linear' | 'radial';
  angle?: number;
}

export interface OverlayFieldProps {
  /** Current overlay values, sourced from the section's props bag. Any
   *  field can be undefined — defaults kick in at render time. */
  value: OverlayFieldValue;
  /** Receives a single-field patch. The caller merges into the section
   *  props (or pendingPatch). Caller is responsible for clearing fields
   *  that switching modes no longer needs (or leaving them — they're
   *  read-only until the operator switches back). */
  onChange: (patch: Partial<OverlayFieldValue>) => void;
  /** Theme palette swatches forwarded to ColorField so the operator
   *  picks brand colours via key, not hex. */
  palette?: Array<{ key: string; label?: string; hex: string }>;
}

/**
 * Map an OverlayFieldValue to a CSS-properties preview that the panel
 * paints inside a small swatch. Each stop color already carries its own
 * alpha channel (ColorWithOpacity stores values as rgba(r,g,b,a)) so
 * the preview just slots them straight into the CSS shorthand — no
 * separate opacity multiplier needed. Production buildOverlayStyle
 * follows the same flow.
 */
function previewStyle(value: OverlayFieldValue): CSSProperties {
  if (value.mode === 'gradient') {
    const color1 = value.color1 ?? 'rgba(0,0,0,0)';
    const color2 = value.color2 ?? value.color ?? '#000000';
    const loc1 = value.location1 ?? 0;
    const loc2 = value.location2 ?? 100;
    if (value.gradientType === 'radial') {
      return { backgroundImage: `radial-gradient(circle, ${color1} ${loc1}%, ${color2} ${loc2}%)` };
    }
    const angle = value.angle ?? 180;
    return { backgroundImage: `linear-gradient(${angle}deg, ${color1} ${loc1}%, ${color2} ${loc2}%)` };
  }
  // classic
  return { backgroundColor: value.color ?? 'rgba(0,0,0,0.5)' };
}

export function OverlayField({ value, onChange, palette }: OverlayFieldProps) {
  const mode = value.mode ?? 'classic';

  return (
    <div className="space-y-3">
      {/* Mode toggle — Classic / Gradient (same affordance as Elementor's
          Background Type segmented control). */}
      <LabeledField label="Background Type">
        <div className="inline-flex rounded border border-gray-300 overflow-hidden">
          <button
            type="button"
            onClick={() => onChange({ mode: 'classic' })}
            className={`px-3 py-1.5 text-xs ${mode === 'classic' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Classic
          </button>
          <button
            type="button"
            onClick={() => onChange({ mode: 'gradient' })}
            className={`px-3 py-1.5 text-xs border-l border-gray-300 ${mode === 'gradient' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Gradient
          </button>
        </div>
      </LabeledField>

      {/* Live preview — small swatch row so the operator confirms the
          overlay reads as intended before saving. */}
      <div
        className="h-8 rounded border border-gray-200"
        style={previewStyle(value)}
        title="Overlay preview"
      />

      {mode === 'classic' ? (
        <LabeledField label="Color" hint="색상 + 투명도가 한 값으로 저장됩니다 (rgba)">
          <ColorWithOpacity
            value={value.color ?? ''}
            onChange={(next) => onChange({ color: next })}
            palette={palette}
          />
        </LabeledField>
      ) : (
        <>
          <LabeledField label="Color 1" hint="첫 stop 의 색 + 투명도">
            <ColorWithOpacity
              value={value.color1 ?? ''}
              onChange={(next) => onChange({ color1: next })}
              palette={palette}
            />
          </LabeledField>
          <LabeledField label="Location 1 (%)">
            <input
              type="range"
              min={0}
              max={100}
              value={value.location1 ?? 0}
              onChange={(e) => onChange({ location1: Number(e.target.value) })}
              className="w-full"
            />
            <p className="mt-1 text-[10px] text-gray-500 font-mono">{value.location1 ?? 0}%</p>
          </LabeledField>

          <LabeledField label="Color 2" hint="두 번째 stop 의 색 + 투명도 (fade-out 은 alpha 0)">
            <ColorWithOpacity
              value={value.color2 ?? ''}
              onChange={(next) => onChange({ color2: next })}
              palette={palette}
            />
          </LabeledField>
          <LabeledField label="Location 2 (%)">
            <input
              type="range"
              min={0}
              max={100}
              value={value.location2 ?? 100}
              onChange={(e) => onChange({ location2: Number(e.target.value) })}
              className="w-full"
            />
            <p className="mt-1 text-[10px] text-gray-500 font-mono">{value.location2 ?? 100}%</p>
          </LabeledField>

          <LabeledField label="Type">
            <select
              value={value.gradientType ?? 'linear'}
              onChange={(e) => onChange({ gradientType: e.target.value as 'linear' | 'radial' })}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white"
            >
              <option value="linear">Linear</option>
              <option value="radial">Radial</option>
            </select>
          </LabeledField>

          {(value.gradientType ?? 'linear') === 'linear' && (
            <LabeledField label="Angle (deg)">
              <input
                type="range"
                min={0}
                max={360}
                value={value.angle ?? 180}
                onChange={(e) => onChange({ angle: Number(e.target.value) })}
                className="w-full"
              />
              <p className="mt-1 text-[10px] text-gray-500 font-mono">{value.angle ?? 180}°</p>
            </LabeledField>
          )}
        </>
      )}
    </div>
  );
}
