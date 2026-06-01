/**
 * Overlay color resolution — bridges the inspector's color field and
 * the block's overlay rendering.
 *
 * ColorField (admin) lets the operator type any of:
 *   - hex            ('#000', '#000000')
 *   - palette key    ('primary', 'accent', 'background', ...)
 *   - CSS color fn   ('rgba(...)', 'var(--something)', 'color-mix(...)')
 *
 * Block renderers used to call `hexToRgb` unconditionally, which
 * returned `0, 0, 0` (black) for any non-hex input — so an operator
 * who picked 'primary' from the palette got a black overlay regardless
 * of their brand color. This helper handles all three input shapes
 * and uses `color-mix(in srgb, ...)` for non-hex inputs so the alpha
 * still applies correctly.
 */

// Tenant layout (apps/web/app/tenant/[slug]/layout.tsx) emits both the
// legacy `--dw-*` and the block-renderer-friendly `--accent / --bg-* /
// --text-* / --border` CSS variables. Map operator-facing palette keys
// to whichever variable resolves first.
const PALETTE_VAR: Record<string, string> = {
  primary:    'var(--accent, var(--dw-primary, currentColor))',
  secondary:  'var(--dw-secondary, currentColor)',
  accent:     'var(--accent, var(--dw-accent, currentColor))',
  background: 'var(--bg, var(--dw-background, transparent))',
  surface:    'var(--bg-subtle, var(--dw-surface, transparent))',
  text:       'var(--text-primary, var(--dw-text, currentColor))',
  muted:      'var(--text-muted, currentColor)',
  border:     'var(--border, currentColor)',
};

function paletteKeyToVar(key: string): string {
  return PALETTE_VAR[key] ?? `var(--${key}, currentColor)`;
}

function hexToRgbTriple(hex: string): string {
  const h = hex.replace('#', '');
  const expanded = h.length === 3
    ? h.split('').map((c) => c + c).join('')
    : h;
  const r = parseInt(expanded.substring(0, 2), 16) || 0;
  const g = parseInt(expanded.substring(2, 4), 16) || 0;
  const b = parseInt(expanded.substring(4, 6), 16) || 0;
  return `${r}, ${g}, ${b}`;
}

/**
 * Resolve an operator-supplied color + opacity into a single CSS color
 * string ready for `backgroundColor` / gradient stops.
 *
 *   '#1a4d2e'   + 0.5 → 'rgba(26, 77, 46, 0.5)'
 *   'primary'   + 0.5 → 'color-mix(in srgb, var(--accent, ...) 50%, transparent)'
 *   'rgba(...)' + any → unchanged (operator already specified alpha)
 *   ''          + 0.5 → 'rgba(0, 0, 0, 0.5)'   (legacy fallback)
 */
export function resolveOverlayColor(color: string, alpha: number): string {
  const trimmed = (color || '').trim();
  const a = Math.max(0, Math.min(1, alpha));
  // Empty color = no overlay. Returning 'transparent' lets the caller's
  // `backgroundColor` / gradient stop render as no-op. NEVER fall back
  // to black — operators who didn't set a brand overlay shouldn't get
  // a free black tint on every hero across the site. See
  // feedback-no-hardcoded-defaults.
  if (!trimmed) return 'transparent';
  if (trimmed.startsWith('#')) {
    return `rgba(${hexToRgbTriple(trimmed)}, ${a})`;
  }
  // Already a CSS color function — pass through. The operator
  // explicitly set alpha (or doesn't want our slider to drive it).
  if (
    trimmed.startsWith('rgb(')      ||
    trimmed.startsWith('rgba(')     ||
    trimmed.startsWith('hsl(')      ||
    trimmed.startsWith('hsla(')     ||
    trimmed.startsWith('var(')      ||
    trimmed.startsWith('color-mix(')
  ) {
    return trimmed;
  }
  // Palette key or named CSS color — wrap with color-mix so alpha
  // applies. `color-mix(in srgb, ...)` is supported on every Chromium,
  // WebKit, and Firefox release shipped since mid-2023.
  const cssColor = paletteKeyToVar(trimmed);
  return `color-mix(in srgb, ${cssColor} ${Math.round(a * 100)}%, transparent)`;
}
