import type { CSSProperties } from 'react';

/**
 * Per-element style overrides — written by the sketchboard's floating
 * text toolbar into section.elementStyles[key] (and section.items[i].
 * elementStyles[key] for list items). Storefront blocks merge these on
 * top of their default inline styles so the operator's "make this title
 * a notch bigger" tweak survives the round-trip.
 *
 * Color resolution mirrors lib/typography-css.ts: palette keys
 * (primary / accent / text / muted / etc.) resolve against theme.colors,
 * which in the storefront are exposed as CSS variables (--accent,
 * --text-primary, etc.) on the tenant layout's wrapper.
 */

export interface ElementStyle {
  // Text-side overrides (apply to <h1>, <p>, <span>, etc.)
  fontSize?: string;
  fontWeight?: string;
  letterSpacing?: string;
  lineHeight?: string;
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
  // Visual / image-side overrides (apply to <img>, decorative wrappers,
  // call-to-action buttons). Stored on the same per-key blob so the
  // operator's "round this picture's corners" tweak survives the same
  // round-trip as their "make this title a notch bigger" tweak.
  borderRadius?: string;
  aspectRatio?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  opacity?: string;
  maxWidth?: string;
  maxHeight?: string;
  /**
   * CSS margin-inline shorthand for horizontal positioning of a
   * constrained-width element. Common values:
   *   - 'auto'    → center (start=auto, end=auto)
   *   - 'auto 0'  → right (start=auto, end=0)
   *   - '0 auto'  → start (start=0, end=auto)  [rarely needed, default behavior]
   * Useful for centering an <img> that has maxWidth=480px, where
   * setting textAlign on the parent doesn't reliably center a block
   * element. The inspector's element-level "가로 위치" toggle writes
   * this field.
   */
  marginInline?: string;
  // Box-model spacing — operator-controlled per-element. All values are
  // CSS-valid strings (px / rem / em / clamp / etc.) so the operator can
  // mix units freely. Gap is intentionally NOT here — it lives at the
  // block (section) level via BlockStyle.spacing.gap because gap is the
  // distance between sibling ELEMENTS inside a block, not a property
  // of any single element. The section-level inspector exposes it.
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  // Phase-D advanced overrides — Elementor-class controls that cover
  // shadow, blending, and transform. Operator-supplied raw CSS values;
  // we don't validate (browser drops malformed values silently).
  textShadow?: string;     // e.g. '2px 2px 6px rgba(0,0,0,0.4)'
  boxShadow?: string;      // shared between text wrappers + image cards
  mixBlendMode?: string;   // 'normal' | 'multiply' | 'screen' | etc.
  transform?: string;      // e.g. 'rotate(-2deg)' or 'translateY(-4px)'
  background?: string;     // text wrapper bg (highlight effect) / image overlay
}

const PALETTE_VARS: Record<string, string> = {
  primary:    'var(--dw-primary, var(--accent))',
  secondary:  'var(--dw-secondary, var(--text-secondary))',
  accent:     'var(--dw-accent, var(--accent))',
  text:       'var(--dw-text, var(--text-primary))',
  muted:      'var(--text-muted)',
  background: 'var(--dw-background, var(--bg))',
  surface:    'var(--dw-surface, var(--bg-subtle))',
  border:     'var(--border)',
  // Dark-background text colors — used over image/overlay sections (hero etc.).
  // White fallbacks so copy stays readable before the token is themed.
  onDark:      'var(--brand-onDark, #ffffff)',
  onDarkMuted: 'var(--brand-onDarkMuted, rgba(255,255,255,0.85))',
};

function resolveColor(value: string): string {
  if (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl') || value.startsWith('var(')) {
    return value;
  }
  return PALETTE_VARS[value] ?? value;
}

/**
 * Read elementStyles[key] off a props bag (or item) and convert to a
 * CSS object. Returns an empty object when the override is missing or
 * has no usable fields, so spreading is safe.
 */
export function getElementStyle(
  source: { elementStyles?: Record<string, ElementStyle | undefined> } | undefined,
  key: string,
): CSSProperties {
  const override = source?.elementStyles?.[key];
  if (!override) return {};
  const out: CSSProperties = {};
  // Text fields
  if (override.fontSize?.trim()) out.fontSize = override.fontSize.trim();
  if (override.fontWeight?.trim()) out.fontWeight = override.fontWeight.trim();
  if (override.letterSpacing?.trim()) out.letterSpacing = override.letterSpacing.trim();
  if (override.lineHeight?.trim()) out.lineHeight = override.lineHeight.trim();
  if (override.color?.trim()) out.color = resolveColor(override.color.trim());
  if (override.textAlign) out.textAlign = override.textAlign;
  // Visual / image fields
  if (override.borderRadius?.trim()) out.borderRadius = override.borderRadius.trim();
  if (override.aspectRatio?.trim()) out.aspectRatio = override.aspectRatio.trim();
  if (override.objectFit) out.objectFit = override.objectFit;
  if (override.opacity?.trim()) out.opacity = override.opacity.trim();
  if (override.maxWidth?.trim()) out.maxWidth = override.maxWidth.trim();
  if (override.maxHeight?.trim()) out.maxHeight = override.maxHeight.trim();
  if (override.marginInline?.trim()) out.marginInline = override.marginInline.trim();
  // Box-model spacing
  if (override.marginTop?.trim()) out.marginTop = override.marginTop.trim();
  if (override.marginRight?.trim()) out.marginRight = override.marginRight.trim();
  if (override.marginBottom?.trim()) out.marginBottom = override.marginBottom.trim();
  if (override.marginLeft?.trim()) out.marginLeft = override.marginLeft.trim();
  if (override.paddingTop?.trim()) out.paddingTop = override.paddingTop.trim();
  if (override.paddingRight?.trim()) out.paddingRight = override.paddingRight.trim();
  if (override.paddingBottom?.trim()) out.paddingBottom = override.paddingBottom.trim();
  if (override.paddingLeft?.trim()) out.paddingLeft = override.paddingLeft.trim();
  // Phase-D advanced
  if (override.textShadow?.trim()) out.textShadow = override.textShadow.trim();
  if (override.boxShadow?.trim()) out.boxShadow = override.boxShadow.trim();
  if (override.mixBlendMode?.trim()) {
    (out as Record<string, unknown>).mixBlendMode = override.mixBlendMode.trim();
  }
  if (override.transform?.trim()) out.transform = override.transform.trim();
  if (override.background?.trim()) out.background = override.background.trim();
  return out;
}

/**
 * Merge an element-level override on top of a base style. Override wins
 * for any field it sets; missing fields fall through to base.
 */
export function mergeElementStyle(
  base: CSSProperties,
  source: { elementStyles?: Record<string, ElementStyle | undefined> } | undefined,
  key: string,
): CSSProperties {
  return { ...base, ...getElementStyle(source, key) };
}

/**
 * Convert one ElementStyle into a CSS declaration string (no selector).
 * Used by buildElementHoverCss to emit :hover rules at render time —
 * inline styles can't express :hover, so the hover variants live in a
 * stamped <style> tag that targets [data-element="..."]:hover.
 *
 * Mirrors getElementStyle's field handling but emits CSS-property-name
 * format ('font-size' instead of 'fontSize') so the output is a raw
 * stylesheet declaration block.
 */
function elementStyleToCssDecls(style: ElementStyle): string {
  const decls: string[] = [];
  if (style.fontSize?.trim()) decls.push(`font-size: ${style.fontSize.trim()}`);
  if (style.fontWeight?.trim()) decls.push(`font-weight: ${style.fontWeight.trim()}`);
  if (style.letterSpacing?.trim()) decls.push(`letter-spacing: ${style.letterSpacing.trim()}`);
  if (style.lineHeight?.trim()) decls.push(`line-height: ${style.lineHeight.trim()}`);
  if (style.color?.trim()) decls.push(`color: ${resolveColor(style.color.trim())}`);
  if (style.textAlign) decls.push(`text-align: ${style.textAlign}`);
  if (style.borderRadius?.trim()) decls.push(`border-radius: ${style.borderRadius.trim()}`);
  if (style.aspectRatio?.trim()) decls.push(`aspect-ratio: ${style.aspectRatio.trim()}`);
  if (style.objectFit) decls.push(`object-fit: ${style.objectFit}`);
  if (style.opacity?.trim()) decls.push(`opacity: ${style.opacity.trim()}`);
  if (style.maxWidth?.trim()) decls.push(`max-width: ${style.maxWidth.trim()}`);
  if (style.maxHeight?.trim()) decls.push(`max-height: ${style.maxHeight.trim()}`);
  if (style.marginInline?.trim()) decls.push(`margin-inline: ${style.marginInline.trim()}`);
  if (style.marginTop?.trim()) decls.push(`margin-top: ${style.marginTop.trim()}`);
  if (style.marginRight?.trim()) decls.push(`margin-right: ${style.marginRight.trim()}`);
  if (style.marginBottom?.trim()) decls.push(`margin-bottom: ${style.marginBottom.trim()}`);
  if (style.marginLeft?.trim()) decls.push(`margin-left: ${style.marginLeft.trim()}`);
  if (style.paddingTop?.trim()) decls.push(`padding-top: ${style.paddingTop.trim()}`);
  if (style.paddingRight?.trim()) decls.push(`padding-right: ${style.paddingRight.trim()}`);
  if (style.paddingBottom?.trim()) decls.push(`padding-bottom: ${style.paddingBottom.trim()}`);
  if (style.paddingLeft?.trim()) decls.push(`padding-left: ${style.paddingLeft.trim()}`);
  if (style.textShadow?.trim()) decls.push(`text-shadow: ${style.textShadow.trim()}`);
  if (style.boxShadow?.trim()) decls.push(`box-shadow: ${style.boxShadow.trim()}`);
  if (style.mixBlendMode?.trim()) decls.push(`mix-blend-mode: ${style.mixBlendMode.trim()}`);
  if (style.transform?.trim()) decls.push(`transform: ${style.transform.trim()}`);
  if (style.background?.trim()) decls.push(`background: ${style.background.trim()}`);
  return decls.join('; ');
}

/**
 * Build a CSS string for every `:hover`-suffixed key in
 * section.props.elementStyles. Operator-set hover overrides live at
 * `elementStyles['title:hover']` etc. (parallel to base
 * `elementStyles['title']`). Inline styles can't express :hover, so
 * the storefront / canvas inject these as a stylesheet scoped by
 * `[data-section-id="..."]`.
 *
 * Returns an empty string when no hover overrides exist — caller can
 * skip rendering the <style> tag. Caller is responsible for stamping
 * `data-section-id` on the section wrapper.
 */
export function buildElementHoverCss(
  sectionId: string,
  source: { elementStyles?: Record<string, ElementStyle | undefined> } | undefined,
): string {
  const styles = source?.elementStyles;
  if (!styles) return '';
  const rules: string[] = [];
  for (const [key, style] of Object.entries(styles)) {
    if (!key.endsWith(':hover') || !style) continue;
    const path = key.replace(/:hover$/, '');
    const decls = elementStyleToCssDecls(style);
    if (!decls) continue;
    rules.push(
      `[data-section-id="${sectionId}"] [data-element="${path}"]:hover { ${decls}; }`,
    );
  }
  return rules.join('\n');
}
