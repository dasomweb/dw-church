import type { BlockStyle, BoxSides, ShadowConfig, BorderConfig } from '@dw-church/design-tokens';
import { RADIUS_PRESET_LABELS } from '@dw-church/design-tokens';
import { BoxSidesField, LabeledField, TokenSelectField } from './property-fields';

/**
 * Section-level BlockStyle editor. Renders only when the operator has
 * selected a SECTION (elementKey === '__section__') — drives
 * section.styleOverrides which the BlockRenderer wrapper picks up via
 * blockStyleToCss(). Padding + margin land as the wrapper's `padding` /
 * `margin` shorthand; gap flows through the `--block-gap` CSS variable
 * the wrapper also emits, which the 7 core blocks (Hero / CTA / Text /
 * TextImage / Quote / Features / Testimonials) read on their primary
 * content stack to space their eyebrow / title / subtitle / CTA rows.
 *
 * Empty padding / margin / gap collapse back to undefined so the
 * spacing object drops cleanly when the operator clears everything,
 * and an entirely-empty BlockStyle collapses to null so the server
 * clears the row's style_overrides back to NULL (global cascade).
 *
 * Phase C-2: shadow.preset + border.radius preset surfaced as selects
 * driven by `@dw-church/design-tokens` label maps so the dropdowns stay
 * in sync with the schema's preset enum.
 */

export interface BlockStyleInspectorProps {
  value: BlockStyle | null;
  onChange: (next: BlockStyle | null) => void;
}

function collapseBlockStyle(base: BlockStyle): BlockStyle | null {
  if (Object.keys(base).length === 0) return null;
  return base;
}

function withSpacing(
  base: BlockStyle | null,
  key: 'padding' | 'margin',
  next: BoxSides | undefined,
): BlockStyle | null {
  const spacing = { ...(base?.spacing ?? {}) };
  if (next === undefined) {
    delete spacing[key];
  } else {
    spacing[key] = next;
  }
  const cleanedSpacing =
    spacing.padding === undefined && spacing.margin === undefined && spacing.gap === undefined
      ? undefined
      : spacing;
  const cleanedBase: BlockStyle = { ...(base ?? {}) };
  if (cleanedSpacing === undefined) {
    delete cleanedBase.spacing;
  } else {
    cleanedBase.spacing = cleanedSpacing;
  }
  return collapseBlockStyle(cleanedBase);
}

function withGap(base: BlockStyle | null, gap: number | undefined): BlockStyle | null {
  const spacing = { ...(base?.spacing ?? {}) };
  if (gap === undefined) {
    delete spacing.gap;
  } else {
    spacing.gap = gap;
  }
  const cleanedSpacing =
    spacing.padding === undefined && spacing.margin === undefined && spacing.gap === undefined
      ? undefined
      : spacing;
  const cleanedBase: BlockStyle = { ...(base ?? {}) };
  if (cleanedSpacing === undefined) {
    delete cleanedBase.spacing;
  } else {
    cleanedBase.spacing = cleanedSpacing;
  }
  return collapseBlockStyle(cleanedBase);
}

function withShadowPreset(
  base: BlockStyle | null,
  preset: ShadowConfig['preset'] | undefined,
): BlockStyle | null {
  const cleanedBase: BlockStyle = { ...(base ?? {}) };
  if (preset === undefined) {
    delete cleanedBase.shadow;
  } else {
    // Keep any operator-set custom alongside the preset choice — preset
    // wins in blockStyleToCss but we don't want to silently drop custom
    // settings when the operator toggles between presets.
    cleanedBase.shadow = { ...(base?.shadow ?? {}), preset };
  }
  return collapseBlockStyle(cleanedBase);
}

function withBackgroundColor(base: BlockStyle | null, hex: string | undefined): BlockStyle | null {
  const background = { ...(base?.background ?? {}) };
  if (!hex) {
    delete background.color;
  } else {
    background.color = { hex };
  }
  const cleanedBg =
    background.color === undefined && background.image === undefined && background.gradient === undefined
      ? undefined
      : background;
  const cleanedBase: BlockStyle = { ...(base ?? {}) };
  if (cleanedBg === undefined) delete cleanedBase.background;
  else cleanedBase.background = cleanedBg;
  return collapseBlockStyle(cleanedBase);
}

function withOverlay(
  base: BlockStyle | null,
  patch: { hex?: string | undefined; opacity?: number | undefined },
): BlockStyle | null {
  const overlay = { ...(base?.overlay ?? {}) };
  if ('hex' in patch) {
    if (!patch.hex) delete overlay.color;
    else overlay.color = { hex: patch.hex };
  }
  if ('opacity' in patch) {
    if (patch.opacity === undefined) delete overlay.opacity;
    else overlay.opacity = patch.opacity;
  }
  const cleanedOverlay =
    overlay.color === undefined && overlay.opacity === undefined && overlay.gradient === undefined && overlay.image === undefined
      ? undefined
      : overlay;
  const cleanedBase: BlockStyle = { ...(base ?? {}) };
  if (cleanedOverlay === undefined) delete cleanedBase.overlay;
  else cleanedBase.overlay = cleanedOverlay;
  return collapseBlockStyle(cleanedBase);
}

function withBorderRadius(
  base: BlockStyle | null,
  radius: number | undefined,
): BlockStyle | null {
  const border: BorderConfig = { ...(base?.border ?? {}) };
  if (radius === undefined) {
    delete border.radius;
  } else {
    border.radius = radius;
  }
  const cleanedBase: BlockStyle = { ...(base ?? {}) };
  if (
    border.width === undefined &&
    border.style === undefined &&
    border.color === undefined &&
    border.radius === undefined
  ) {
    delete cleanedBase.border;
  } else {
    cleanedBase.border = border;
  }
  return collapseBlockStyle(cleanedBase);
}

function parseGapPx(raw: string): number | undefined {
  const trimmed = raw.trim().replace(/px$/i, '');
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n);
}

// Operator-curated radius preset → px value. Mirrors the radius slots
// declared in @dw-church/design-tokens (designTokenRadiusSchema sm/md/lg).
// 'full' goes to 9999 so the section renders as a fully-pill shape.
const RADIUS_PRESET_PX: Record<keyof typeof RADIUS_PRESET_LABELS, number> = {
  sm: 4,
  md: 8,
  lg: 16,
  full: 9999,
};

/** Match the current numeric radius back to its preset key, or null if
 *  the operator typed a freeform value that doesn't match any preset
 *  (so the select shows "Custom"). */
function radiusToPresetKey(
  radius: number | undefined,
): keyof typeof RADIUS_PRESET_LABELS | null | undefined {
  if (radius === undefined) return undefined;
  for (const [key, px] of Object.entries(RADIUS_PRESET_PX)) {
    if (radius === px) return key as keyof typeof RADIUS_PRESET_LABELS;
  }
  return null;
}

/** Color swatch + hex text + clear (×). Empty hex === inherit/none. */
function HexColorRow({ hex, onChange }: { hex: string; onChange: (hex: string | undefined) => void }) {
  // A native color input needs a valid #rrggbb; fall back to #ffffff for the
  // swatch while keeping the actual stored value empty when unset.
  const swatch = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#ffffff';
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={swatch}
        onChange={(e) => onChange(e.target.value)}
        className="w-9 h-9 rounded cursor-pointer border border-gray-300"
      />
      <input
        type="text"
        value={hex}
        placeholder="#RRGGBB"
        onChange={(e) => onChange(e.target.value.trim() || undefined)}
        className="flex-1 text-xs font-mono border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none"
      />
      {hex && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="text-xs text-gray-400 hover:text-gray-700 px-1"
          title="지우기"
        >
          ✕
        </button>
      )}
    </div>
  );
}

export function BlockStyleInspector({ value, onChange }: BlockStyleInspectorProps) {
  const padding = value?.spacing?.padding;
  const margin = value?.spacing?.margin;
  const gap = value?.spacing?.gap;
  const shadowPreset = value?.shadow?.preset;
  const radius = value?.border?.radius;
  const radiusPresetKey = radiusToPresetKey(radius);
  // Background / overlay show their hex when set directly. A token-based color
  // (rare for sections) leaves the picker blank — the operator can type a hex
  // to switch to a literal color.
  const bgHex = value?.background?.color?.hex ?? '';
  const overlayHex = value?.overlay?.color?.hex ?? '';
  const overlayOpacity = value?.overlay?.opacity;

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
          배경 & 오버레이
        </div>
        <div className="space-y-3">
          <LabeledField label="배경 색상" hint="섹션 전체 배경. 비우면 테마 기본 배경을 사용합니다.">
            <HexColorRow
              hex={bgHex}
              onChange={(hex) => onChange(withBackgroundColor(value, hex))}
            />
          </LabeledField>
          <LabeledField label="오버레이 색상" hint="배경 위에 덮는 반투명 레이어. 배경 이미지 위 텍스트 가독성에 사용.">
            <HexColorRow
              hex={overlayHex}
              onChange={(hex) => onChange(withOverlay(value, { hex }))}
            />
          </LabeledField>
          {overlayHex && (
            <LabeledField label={`오버레이 투명도 (${Math.round((overlayOpacity ?? 1) * 100)}%)`}>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round((overlayOpacity ?? 1) * 100)}
                onChange={(e) => onChange(withOverlay(value, { opacity: Number(e.target.value) / 100 }))}
                className="w-full"
              />
            </LabeledField>
          )}
        </div>
      </div>
      <div>
        <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Section Style
        </div>
        <div className="space-y-3">
          <BoxSidesField
            label="Padding (px)"
            value={padding}
            onChange={(next) => onChange(withSpacing(value, 'padding', next))}
          />
          <BoxSidesField
            label="Margin (px)"
            value={margin}
            onChange={(next) => onChange(withSpacing(value, 'margin', next))}
          />
          <LabeledField
            label="Element Gap (px)"
            hint="Vertical gap between the eyebrow / title / body / button rows inside the section. Currently honored by Hero · CTA · Text · TextImage · Quote · Features · Testimonials."
          >
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400 w-3 text-center" title="Gap between child elements">↕</span>
              <input
                type="text"
                inputMode="numeric"
                value={gap === undefined ? '' : String(gap)}
                onChange={(e) => onChange(withGap(value, parseGapPx(e.target.value)))}
                placeholder="px"
                className="flex-1 text-xs font-mono border border-gray-300 rounded px-1.5 py-1 focus:border-blue-500 outline-none"
              />
            </div>
          </LabeledField>

          {/* Shadow preset — driven by design-tokens SHADOW_PRESET_LABELS
           *  via TokenSelectField. The wrapper passes raw preset keys
           *  ('sm' / 'md' / 'lg' / 'xl' / 'none') back; the spread into
           *  shadow.preset matches the typed schema. */}
          <TokenSelectField
            tokenGroup="shadow"
            label="Shadow"
            value={shadowPreset ?? ''}
            onChange={(next) => onChange(withShadowPreset(value, next as ShadowConfig['preset'] | undefined))}
            nonePlaceholder="— None (theme default)"
          />

          {/* Border radius preset — TokenSelectField yields the preset
           *  key ('sm' / 'md' / 'lg' / 'full'); we translate to px via
           *  RADIUS_PRESET_PX before writing. When the stored radius
           *  doesn't match any preset (operator typed a freeform px
           *  elsewhere), surface it as a "Custom (Npx)" sentinel row. */}
          <TokenSelectField
            tokenGroup="radius"
            label="Border Radius"
            value={radiusPresetKey ?? undefined}
            onChange={(next) => {
              if (next === undefined) {
                onChange(withBorderRadius(value, undefined));
              } else if (next in RADIUS_PRESET_PX) {
                onChange(withBorderRadius(value, RADIUS_PRESET_PX[next as keyof typeof RADIUS_PRESET_PX]));
              }
            }}
            nonePlaceholder="— None (theme default)"
          />
          {radiusPresetKey === null && radius !== undefined && (
            <p className="text-[10px] text-gray-400 leading-snug -mt-2">
              Current value: <code>{radius}px</code> (custom — pick a preset above to standardise)
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
