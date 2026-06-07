/**
 * DesignField — Section 의 시각 surface 한 묶음 (Background Position +
 * Section Background color). Overlay / Border 는 별도 multi-prop
 * 컴포넌트라 여기 포함 안 함.
 *
 * Storage shape — flat top-level props:
 *   backgroundImagePosition : 9-cell 의 한 값 ('center' / 'top-left' / …)
 *   backgroundColor         : hex / palette key ('primary' / 'accent' / …)
 *
 * 두 필드 모두 옵션 (`enabledFields`) 으로 켜고 끔.
 */

import { ColorField } from './ColorField';
import { LabeledField } from './LabeledField';

export type SectionBackgroundPosition =
  | 'center' | 'top' | 'bottom' | 'left' | 'right'
  | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface DesignFieldValue {
  backgroundImagePosition?: SectionBackgroundPosition;
  backgroundColor?: string;
}

export interface DesignFieldProps {
  value: DesignFieldValue;
  onChange: (patch: Partial<DesignFieldValue>) => void;
  palette?: Array<{ key: string; label?: string; hex: string }>;
  enabledFields?: {
    backgroundPosition?: boolean;
    sectionBackground?: boolean;
  };
  /** Section Background hint — 'Used by text-only / split-image variants
   *  — blank falls back to theme default' 같은 블록별 부연. */
  backgroundColorHint?: string;
}

const POSITION_OPTIONS: Array<{ value: SectionBackgroundPosition; label: string }> = [
  { value: 'center',       label: 'Center' },
  { value: 'top',          label: 'Top Center' },
  { value: 'bottom',       label: 'Bottom Center' },
  { value: 'left',         label: 'Center Left' },
  { value: 'right',        label: 'Center Right' },
  { value: 'top-left',     label: 'Top Left' },
  { value: 'top-right',    label: 'Top Right' },
  { value: 'bottom-left',  label: 'Bottom Left' },
  { value: 'bottom-right', label: 'Bottom Right' },
];

export function DesignField({
  value,
  onChange,
  palette,
  enabledFields,
  backgroundColorHint,
}: DesignFieldProps) {
  const show = {
    backgroundPosition: enabledFields?.backgroundPosition ?? true,
    sectionBackground: enabledFields?.sectionBackground ?? true,
  };

  return (
    <div className="space-y-3">
      {show.backgroundPosition && (
        <LabeledField label="Background Position" hint="배경 이미지의 anchor 위치 (9-cell)">
          <select
            value={value.backgroundImagePosition ?? ''}
            onChange={(e) =>
              onChange({
                backgroundImagePosition:
                  (e.target.value || undefined) as SectionBackgroundPosition | undefined,
              })
            }
            className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white focus:border-blue-500 outline-none"
          >
            <option value="">— 기본값</option>
            {POSITION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </LabeledField>
      )}

      {show.sectionBackground && (
        <LabeledField label="Section Background" hint={backgroundColorHint}>
          <ColorField
            value={value.backgroundColor ?? ''}
            onChange={(next) => onChange({ backgroundColor: next })}
            palette={palette}
          />
        </LabeledField>
      )}
    </div>
  );
}
