/**
 * BlockStyle → React.CSSProperties converter.
 *
 * Used by BlockRenderer to wrap each section in a `<div style={...}>` that
 * applies the operator-set per-section override. Pure function: same input
 * always produces the same output. Phase-5 parity test will pin this to a
 * matching server-side resolver to guarantee canvas ↔ storefront visual
 * consistency.
 *
 * The output style only sets fields that the BlockStyle explicitly supplies.
 * Anything missing falls through to the cascade — block defaults → preview
 * scope `--brand-*` vars → storefront `:root` vars.
 */
import type { CSSProperties } from 'react';
import type {
  BlockStyle,
  BoxSides,
  ColorValue,
  ShadowConfig,
} from '@dw-church/design-tokens';
import { resolveColorToCss } from '@dw-church/design-tokens';

const SHADOW_TOKEN_VAR: Record<string, string> = {
  sm: 'var(--brand-shadow-sm)',
  md: 'var(--brand-shadow-md)',
  lg: 'var(--brand-shadow-lg)',
  xl: 'var(--brand-shadow-xl)',
};

const FONT_WEIGHT_VALUE: Record<string, number> = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

function px(n: number | undefined): string | undefined {
  return n === undefined ? undefined : `${n}px`;
}

/** "10 0 8 0" CSS shorthand from BoxSides — preserves explicit zeros. */
function boxShorthand(b: BoxSides | undefined): string | undefined {
  if (!b) return undefined;
  const t = b.top ?? 0;
  const r = b.right ?? 0;
  const bb = b.bottom ?? 0;
  const l = b.left ?? 0;
  // If everything is undefined, skip emit. (Caller handles this — we got
  // here because at least one side was set.)
  if (b.top === undefined && b.right === undefined && b.bottom === undefined && b.left === undefined) {
    return undefined;
  }
  return `${t}px ${r}px ${bb}px ${l}px`;
}

function shadowCss(s: ShadowConfig | undefined): string | undefined {
  if (!s) return undefined;
  if (s.preset && s.preset !== 'none') return SHADOW_TOKEN_VAR[s.preset];
  if (s.preset === 'none') return 'none';
  if (s.custom) {
    const c = s.custom;
    const color = resolveColorToCss(c.color, 'rgba(0,0,0,0.15)');
    return `${c.inset ? 'inset ' : ''}${c.x}px ${c.y}px ${c.blur}px ${c.spread ?? 0}px ${color}`;
  }
  return undefined;
}

function gradientCss(g: NonNullable<BlockStyle['background']>['gradient']): string | undefined {
  if (!g) return undefined;
  const stops = g.stops
    .map((s) => `${resolveColorToCss(s.color, 'transparent')} ${s.at}%`)
    .join(', ');
  if (g.type === 'radial') return `radial-gradient(${stops})`;
  const angle = g.angle ?? 180;
  return `linear-gradient(${angle}deg, ${stops})`;
}

function backgroundColor(c: ColorValue | undefined): string | undefined {
  return resolveColorToCss(c, '');
}

/**
 * Convert a BlockStyle into React.CSSProperties suitable for inline emit.
 * Returns an empty object when the style is undefined / empty.
 */
export function blockStyleToCss(style: BlockStyle | null | undefined): CSSProperties {
  if (!style) return {};
  const css: CSSProperties = {};

  // ─── Spacing ───────────────────────────────────────────────────────────
  if (style.spacing) {
    const padding = boxShorthand(style.spacing.padding);
    const margin = boxShorthand(style.spacing.margin);
    if (padding) css.padding = padding;
    if (margin) css.margin = margin;
    if (style.spacing.gap !== undefined) {
      // Two-way emit: the literal `gap` lands as a no-op on the
      // wrapper (its only child is the block root), but it costs
      // nothing. The cascade-friendly CSS variable is the actual
      // signal — each block's primary content stack reads
      // `var(--block-gap, <its-own-default>)` so the operator's
      // gap value reaches the right container even though the
      // wrapper itself can't flow it as a flex/grid gap.
      const gapPx = px(style.spacing.gap);
      if (gapPx !== undefined) {
        css.gap = gapPx;
        (css as Record<string, unknown>)['--block-gap'] = gapPx;
      }
    }
  }

  // ─── Background ────────────────────────────────────────────────────────
  if (style.background) {
    const bgColor = backgroundColor(style.background.color);
    if (bgColor && bgColor !== 'inherit') css.backgroundColor = bgColor;
    const grad = gradientCss(style.background.gradient);
    if (grad) {
      // backgroundImage carries gradient; if image AND gradient both
      // present, gradient sits on top.
      const layers: string[] = [grad];
      if (style.background.image?.url) {
        layers.push(`url(${style.background.image.url})`);
      }
      css.backgroundImage = layers.join(', ');
    } else if (style.background.image?.url) {
      css.backgroundImage = `url(${style.background.image.url})`;
    }
    if (style.background.image) {
      if (style.background.image.position) css.backgroundPosition = style.background.image.position;
      if (style.background.image.size) css.backgroundSize = style.background.image.size;
      if (style.background.image.repeat) css.backgroundRepeat = style.background.image.repeat;
      if (style.background.image.attachment) css.backgroundAttachment = style.background.image.attachment;
    }
  }

  // ─── Border + Radius ───────────────────────────────────────────────────
  if (style.border) {
    if (style.border.width !== undefined) css.borderWidth = px(style.border.width);
    if (style.border.style) css.borderStyle = style.border.style;
    if (style.border.color) {
      const color = resolveColorToCss(style.border.color, '');
      if (color && color !== 'inherit') css.borderColor = color;
    }
    if (style.border.radius !== undefined) css.borderRadius = px(style.border.radius);
  }

  // ─── Shadow ────────────────────────────────────────────────────────────
  const shadow = shadowCss(style.shadow);
  if (shadow) css.boxShadow = shadow;

  // ─── Size ──────────────────────────────────────────────────────────────
  if (style.size) {
    if (style.size.height !== undefined) {
      css.height = style.size.height === 'auto' ? 'auto' : px(style.size.height);
    }
    if (style.size.minHeight !== undefined) css.minHeight = px(style.size.minHeight);
    if (style.size.maxHeight !== undefined) css.maxHeight = px(style.size.maxHeight);
    if (style.size.width !== undefined) {
      if (style.size.width === 'auto') css.width = 'auto';
      else if (style.size.width === 'full') css.width = '100%';
      else css.width = px(style.size.width);
    }
    if (style.size.minWidth !== undefined) css.minWidth = px(style.size.minWidth);
    if (style.size.maxWidth !== undefined) css.maxWidth = px(style.size.maxWidth);
  }

  // ─── Alignment ─────────────────────────────────────────────────────────
  if (style.alignment) {
    if (style.alignment.self) css.alignSelf = style.alignment.self;
    if (style.alignment.items) css.alignItems = style.alignment.items;
    if (style.alignment.justify) {
      // CSS uses justify-content with "flex-start"/"flex-end" — accept the
      // shorter aliases by mapping.
      const map: Record<string, string> = {
        start: 'flex-start',
        end: 'flex-end',
        between: 'space-between',
        around: 'space-around',
        evenly: 'space-evenly',
      };
      css.justifyContent = map[style.alignment.justify] ?? style.alignment.justify;
    }
  }

  // ─── Typography (color / weight / align / line-height / letter-spacing /
  //    transform). Scale -> font-size is handled by the block component itself
  //    via `data-text-scale` so it can pick the right `--brand-{scale}` var. ──
  if (style.typography) {
    if (style.typography.color) {
      const color = resolveColorToCss(style.typography.color, '');
      if (color && color !== 'inherit') css.color = color;
    }
    if (style.typography.weight) {
      css.fontWeight = FONT_WEIGHT_VALUE[style.typography.weight] ?? style.typography.weight;
    }
    if (style.typography.align) css.textAlign = style.typography.align as CSSProperties['textAlign'];
    if (style.typography.lineHeight !== undefined) css.lineHeight = style.typography.lineHeight;
    if (style.typography.letterSpacing !== undefined) css.letterSpacing = px(style.typography.letterSpacing);
    if (style.typography.transform) css.textTransform = style.typography.transform;
  }

  return css;
}

/**
 * Should this section be hidden at the given breakpoint? Used by the storefront
 * + canvas to skip rendering entirely instead of relying on `display:none` —
 * which keeps SSR markup smaller and avoids hydration mismatches.
 */
export function isHiddenOnBreakpoint(
  style: BlockStyle | null | undefined,
  bp: 'desktop' | 'tablet' | 'mobile',
): boolean {
  if (!style?.responsive?.hiddenOn) return false;
  return style.responsive.hiddenOn.includes(bp);
}
