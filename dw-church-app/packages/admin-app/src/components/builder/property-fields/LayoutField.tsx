/**
 * LayoutField — Section sizing + alignment + width 묶음.
 *
 * 같은 4가지 컨트롤 (Height / Text Align / Background Width / Container
 * Width) 이 매 section block registry 마다 반복 선언되던 걸 single
 * multi-prop 패널로 정리. OverlayField / BorderField 와 같은 패턴:
 * 한 LabeledField 안에 묶지 않고 CollapsibleGroup 안에 자체 layout
 * 으로 펼침.
 *
 * Storage shape — flat top-level props on the section bag:
 *   height        : 'sm' | 'md' | 'lg' | 'full'  (height preset)
 *   textAlign     : 'left' | 'center' | 'right'  (헤드라인 + 본문 정렬)
 *   width         : 'full-bleed' | 'contained'   (배경 박스 너비)
 *   contentWidth  : 'contained' | 'full-bleed'   (안쪽 컨테이너 너비)
 *
 * 각 필드는 옵션 (`enabledFields`) 으로 켜고 끔 — 모든 블록이 4개를
 * 다 쓰지 않음. 예: page-hero 만 'Background Width' 무의미.
 */

import { LabeledField } from './LabeledField';

export type HeightPreset =
  | 'xs'
  | 'sm'
  | 'sm-plus'
  | 'md'
  | 'md-plus'
  | 'lg'
  | 'lg-plus'
  | 'xl'
  | 'full';
export type TextAlignChoice = 'left' | 'center' | 'right';
export type WidthChoice = 'full-bleed' | 'contained';

export interface LayoutFieldValue {
  height?: HeightPreset;
  textAlign?: TextAlignChoice;
  width?: WidthChoice;
  contentWidth?: WidthChoice;
}

export interface LayoutFieldProps {
  value: LayoutFieldValue;
  onChange: (patch: Partial<LayoutFieldValue>) => void;
  /** 블록마다 노출할 필드 다름 — 켜진 것만 렌더. 미지정 시 4개 전부. */
  enabledFields?: {
    height?: boolean;
    textAlign?: boolean;
    width?: boolean;
    contentWidth?: boolean;
  };
  /** Height select 의 라벨을 블록별로 (예: CTA 가 'Small (340px)' 등) 다르게
   *  덮어쓸 때 사용. 미지정 시 단순 'Small / Medium / Large / Full screen'. */
  heightChoices?: Array<{ value: HeightPreset; label: string }>;
}

// 9 단계 height (대표님 2026-05-27 정정). sm~lg 사이 중간값 (sm-plus /
// md-plus / lg-plus) 추가, 2xl / half / three-quarter 폐기.
const DEFAULT_HEIGHT_CHOICES: Array<{ value: HeightPreset; label: string }> = [
  { value: 'xs',      label: 'XS (120-160px)' },
  { value: 'sm',      label: 'Small (200-260px)' },
  { value: 'sm-plus', label: 'Small+ (280-340px)' },
  { value: 'md',      label: 'Medium (360-460px)' },
  { value: 'md-plus', label: 'Medium+ (420-520px)' },
  { value: 'lg',      label: 'Large (480-600px)' },
  { value: 'lg-plus', label: 'Large+ (540-660px)' },
  { value: 'xl',      label: 'XL (600-720px)' },
  { value: 'full',    label: '화면 전체' },
];

export function LayoutField({
  value,
  onChange,
  enabledFields,
  heightChoices,
}: LayoutFieldProps) {
  const show = {
    height: enabledFields?.height ?? true,
    textAlign: enabledFields?.textAlign ?? true,
    width: enabledFields?.width ?? true,
    contentWidth: enabledFields?.contentWidth ?? true,
  };
  const heightOpts = heightChoices ?? DEFAULT_HEIGHT_CHOICES;

  return (
    <div className="space-y-3">
      {show.height && (
        <LabeledField label="Height">
          <select
            value={value.height ?? ''}
            onChange={(e) => onChange({ height: (e.target.value || undefined) as HeightPreset | undefined })}
            className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white focus:border-blue-500 outline-none"
          >
            <option value="">— 기본값</option>
            {heightOpts.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </LabeledField>
      )}

      {show.textAlign && (
        <LabeledField label="Align" hint="헤드라인 · 서브타이틀 · 본문의 좌우 정렬">
          <select
            value={value.textAlign ?? ''}
            onChange={(e) => onChange({ textAlign: (e.target.value || undefined) as TextAlignChoice | undefined })}
            className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white focus:border-blue-500 outline-none"
          >
            <option value="">— 기본값</option>
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </LabeledField>
      )}

      {show.width && (
        <LabeledField label="Background Width" hint="배경 (이미지 / 오버레이) 의 외곽 박스 너비">
          <select
            value={value.width ?? ''}
            onChange={(e) => onChange({ width: (e.target.value || undefined) as WidthChoice | undefined })}
            className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white focus:border-blue-500 outline-none"
          >
            <option value="">— 기본값</option>
            <option value="full-bleed">Full-bleed</option>
            <option value="contained">Contained</option>
          </select>
        </LabeledField>
      )}

      {show.contentWidth && (
        <LabeledField label="Container Width" hint="안쪽 컨테이너 너비. 배경이 full-bleed 라도 텍스트는 contained 권장.">
          <select
            value={value.contentWidth ?? ''}
            onChange={(e) => onChange({ contentWidth: (e.target.value || undefined) as WidthChoice | undefined })}
            className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white focus:border-blue-500 outline-none"
          >
            <option value="">— 기본값</option>
            <option value="contained">Contained (권장)</option>
            <option value="full-bleed">Full-bleed</option>
          </select>
        </LabeledField>
      )}
    </div>
  );
}
