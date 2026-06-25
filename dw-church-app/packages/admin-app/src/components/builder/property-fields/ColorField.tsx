import { useEffect, useRef, useState } from 'react';

/**
 * Reusable color picker for the builder inspector.
 *
 * Two collaborating inputs share one value:
 *
 *   1. Native <input type="color"> — visual swatch picker. Disabled
 *      when the value is a palette key (e.g. 'primary'), since the
 *      browser only speaks hex.
 *   2. Free-text input — accepts hex ('#ff0000'), rgba, named CSS
 *      colors, or palette keys ('primary', 'accent') so the operator
 *      can wire to the theme without committing to a literal hex.
 *
 * Optional swatches strip below the row — when `palette` is supplied,
 * each swatch sets the value to the palette KEY (not the hex) so the
 * theme stays the source of truth. Click again to clear.
 *
 * Empty value renders the picker on '#000000' but keeps the value
 * blank, so the storefront default kicks in cleanly.
 */

export interface ColorFieldProps {
  value: string;
  onChange: (next: string) => void;
  /** Theme palette swatches. Clicking writes the key, not the hex. */
  palette?: Array<{ key: string; label?: string; hex: string }>;
  /**
   * Palette key dropdown — used when callers know the keys but not the
   * hex (e.g. element-style override panel where the storefront resolves
   * the var() at render time). Renders alongside the text input as a
   * compact <select>; ignored when `palette` is also supplied.
   */
  paletteKeys?: string[];
  placeholder?: string;
  /**
   * Optional "commit on blur" hook for callers that batch saves until
   * the operator leaves the input — e.g. ThemeEditor's HeaderEditor /
   * FooterEditor pendingPatch flow. Fires when the user blurs either
   * the hex picker, the text input, or after picking a palette swatch.
   */
  onBlur?: () => void;
}

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export function ColorField({
  value,
  onChange,
  palette,
  paletteKeys,
  placeholder,
  onBlur,
}: ColorFieldProps) {
  const isHex = typeof value === 'string' && HEX_RE.test(value.trim());
  // Picker swatch shows the current hex when one is set, or '#000000'
  // as a neutral starting point when the value is a palette key / unset.
  // Always clickable — operators got blocked when a palette key
  // disabled the swatch ("왜 안 열려?") with no signal why.
  const pickerValue = isHex ? value : '#000000';
  // The visual palette popup wins over the simpler keys dropdown when
  // both are supplied (the popup covers the same surface, more clearly).
  const hasVisualPalette = palette && palette.length > 0;
  const showKeySelect = !hasVisualPalette && paletteKeys && paletteKeys.length > 0;

  // Popover state — Elementor-style "Global Colors" panel that opens
  // off the palette trigger button. Click-outside + Esc close.
  const [paletteOpen, setPaletteOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!paletteOpen) return;
    const handleDoc = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setPaletteOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPaletteOpen(false);
    };
    window.addEventListener('mousedown', handleDoc);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleDoc);
      window.removeEventListener('keydown', handleKey);
    };
  }, [paletteOpen]);

  return (
    <div ref={wrapperRef} className="space-y-1.5 relative">
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={pickerValue}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          title={
            isHex
              ? 'Pick color'
              : value
                ? `Current: ${value} — picking will overwrite with hex`
                : 'Pick color'
          }
          // shrink-0 + explicit size: in flex rows a bare <input type=color>
          // collapses to a thin sliver. Force a 32×32 square swatch.
          style={{ width: 32, height: 32 }}
          className="shrink-0 border border-gray-300 rounded cursor-pointer p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={
            placeholder ?? (palette || paletteKeys ? 'primary / #ff0000' : '#000000')
          }
          className="flex-1 text-xs border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none font-mono placeholder:text-gray-400"
        />
        {hasVisualPalette && (
          <button
            type="button"
            onClick={() => setPaletteOpen((v) => !v)}
            title="Global Colors"
            aria-expanded={paletteOpen}
            className={`w-8 h-8 rounded border flex items-center justify-center transition-colors ${
              paletteOpen
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span aria-hidden="true">🎨</span>
          </button>
        )}
        {showKeySelect && (
          // Reflect the active slot: if the value IS a palette key show it,
          // if it's a literal color (hex/rgba/var) show "Custom", else "Palette".
          // Operators asked to see which system color is in use, not a blank box.
          <select
            value={paletteKeys!.includes(value) ? value : value ? 'custom' : ''}
            onChange={(e) => {
              const next = e.target.value;
              if (next === 'custom') {
                // Switch to custom only when not already a literal color, so
                // re-selecting "Custom" never wipes an existing hex.
                if (paletteKeys!.includes(value) || !value) onChange('');
              } else if (next) {
                onChange(next);
              }
            }}
            className="text-xs border border-gray-300 rounded px-1.5 py-1.5 bg-white"
            title="Palette color or Custom"
          >
            <option value="">Palette</option>
            {paletteKeys!.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
            <option value="custom">─ Custom ─</option>
          </select>
        )}
      </div>

      {/* ─── Global Colors popover ───────────────────────────────
          Visual palette panel — color square + name + hex per row.
          Anchored to the trigger button, closes on outside-click /
          Esc. Selecting a swatch writes the KEY to the value (so the
          theme stays the source of truth) and closes. The "Custom"
          row at the bottom switches to hex-only mode by clearing
          the value, letting the picker swatch take over. */}
      {paletteOpen && hasVisualPalette && (
        <div
          role="dialog"
          aria-label="Global Colors"
          className="absolute right-0 top-10 z-30 w-64 rounded-lg border border-gray-200 bg-white shadow-xl overflow-hidden"
        >
          <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-600">
              Global Colors
            </span>
            <button
              type="button"
              onClick={() => setPaletteOpen(false)}
              className="text-gray-400 hover:text-gray-700 text-sm leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <ul className="max-h-72 overflow-auto">
            {palette!.map((p) => {
              const active = value === p.key;
              return (
                <li key={p.key}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(active ? '' : p.key);
                      setPaletteOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors ${
                      active ? 'bg-blue-50' : ''
                    }`}
                  >
                    <span
                      className="w-7 h-7 rounded border border-gray-300 shrink-0"
                      style={{ background: p.hex }}
                      aria-hidden="true"
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs font-medium text-gray-900 capitalize truncate">
                        {p.label ?? p.key}
                      </span>
                    </span>
                    <span className="text-[10px] font-mono text-gray-500 shrink-0">
                      {p.hex}
                    </span>
                  </button>
                </li>
              );
            })}
            <li className="border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setPaletteOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-3"
              >
                <span
                  className="w-7 h-7 rounded border border-dashed border-gray-300 shrink-0 flex items-center justify-center text-gray-400 text-base"
                  aria-hidden="true"
                >
                  ✎
                </span>
                <span>Custom</span>
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

/* ─── Linked-input variant — opacity slider on top of solid color ── */

/**
 * Solid color + opacity slider, packaged as a single rgba(...) string.
 * Used for overlay-style fields (banner overlays, button backgrounds
 * with translucency) where the operator wants one slider for "how
 * see-through" rather than typing rgba() by hand.
 *
 * Falls through to ColorField behavior when the value isn't a parsable
 * rgba/hex — the operator can still type 'primary' or a CSS keyword
 * and the slider just disappears.
 */
export interface ColorWithOpacityProps {
  value: string;
  onChange: (next: string) => void;
  palette?: ColorFieldProps['palette'];
}

export function ColorWithOpacity({ value, onChange, palette }: ColorWithOpacityProps) {
  const parsed = parseColor(value);
  const [draft, setDraft] = useState<number>(parsed?.a ?? 1);

  // Re-sync slider when an external value lands.
  const lastSync = useRef(value);
  useEffect(() => {
    if (lastSync.current === value) return;
    lastSync.current = value;
    const next = parseColor(value);
    if (next) setDraft(next.a);
  }, [value]);

  const setOpacity = (next: number) => {
    setDraft(next);
    if (!parsed) return;
    onChange(toRgbaString(parsed.r, parsed.g, parsed.b, next));
  };

  const setColor = (raw: string) => {
    const incoming = parseColor(raw);
    if (incoming && parsed) {
      onChange(toRgbaString(incoming.r, incoming.g, incoming.b, draft));
    } else {
      onChange(raw);
    }
  };

  const hexForPicker = parsed
    ? `#${[parsed.r, parsed.g, parsed.b].map((n) => n.toString(16).padStart(2, '0')).join('')}`
    : value;

  return (
    <div className="space-y-1.5">
      <ColorField value={hexForPicker} onChange={setColor} palette={palette} />
      {parsed && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 w-12">Opacity</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={draft}
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
            className="flex-1"
          />
          <span className="text-[10px] font-mono text-gray-700 w-8 text-right">
            {Math.round(draft * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}

function parseColor(raw: string): { r: number; g: number; b: number; a: number } | null {
  if (!raw) return null;
  const v = raw.trim();
  // #rgb / #rrggbb / #rrggbbaa
  const hex = HEX_RE.exec(v);
  if (hex) {
    const body = hex[1]!;
    const expand = body.length === 3
      ? body.split('').map((c) => c + c).join('')
      : body;
    const r = parseInt(expand.slice(0, 2), 16);
    const g = parseInt(expand.slice(2, 4), 16);
    const b = parseInt(expand.slice(4, 6), 16);
    const a = expand.length === 8 ? parseInt(expand.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }
  // rgb(...) / rgba(...)
  const rgb = /^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*(?:,\s*([0-9.]+)\s*)?\)$/i.exec(v);
  if (rgb) {
    return {
      r: Math.round(parseFloat(rgb[1]!)),
      g: Math.round(parseFloat(rgb[2]!)),
      b: Math.round(parseFloat(rgb[3]!)),
      a: rgb[4] !== undefined ? parseFloat(rgb[4]) : 1,
    };
  }
  return null;
}

function toRgbaString(r: number, g: number, b: number, a: number): string {
  if (a >= 0.999) return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
  return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(2))})`;
}
