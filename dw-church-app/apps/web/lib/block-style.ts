/**
 * BlockStyle → React.CSSProperties converter (storefront copy).
 *
 * The super-admin page builder's Style/Advanced tabs save a structured
 * BlockStyle to `props.blockStyle` (spacing/여백, background, border, shadow,
 * size, typography color, alignment). BlockRenderer applies the output of
 * this function to each section wrapper so those edits actually render.
 *
 * Mirrors packages/blocks/src/utilities/block-style-resolver.ts verbatim. It
 * is copied (not imported) because apps/web does not depend on
 * @dw-church/blocks; it only needs @dw-church/design-tokens (which it has).
 */
import type { CSSProperties } from 'react';
import type { BlockStyle, BoxSides, ShadowConfig } from '@dw-church/design-tokens';
import { resolveColorToCss } from '@dw-church/design-tokens';

const SHADOW_TOKEN_VAR: Record<string, string> = {
  sm: 'var(--brand-shadow-sm)',
  md: 'var(--brand-shadow-md)',
  lg: 'var(--brand-shadow-lg)',
  xl: 'var(--brand-shadow-xl)',
};

const FONT_WEIGHT_VALUE: Record<string, number> = {
  regular: 400, medium: 500, semibold: 600, bold: 700,
};

function px(n: number | undefined): string | undefined {
  return n === undefined ? undefined : `${n}px`;
}

function boxShorthand(b: BoxSides | undefined): string | undefined {
  if (!b) return undefined;
  if (b.top === undefined && b.right === undefined && b.bottom === undefined && b.left === undefined) {
    return undefined;
  }
  return `${b.top ?? 0}px ${b.right ?? 0}px ${b.bottom ?? 0}px ${b.left ?? 0}px`;
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
  const stops = g.stops.map((s) => `${resolveColorToCss(s.color, 'transparent')} ${s.at}%`).join(', ');
  if (g.type === 'radial') return `radial-gradient(${stops})`;
  return `linear-gradient(${g.angle ?? 180}deg, ${stops})`;
}

export function blockStyleToCss(style: BlockStyle | null | undefined): CSSProperties {
  if (!style) return {};
  const css: CSSProperties = {};

  if (style.spacing) {
    const padding = boxShorthand(style.spacing.padding);
    const margin = boxShorthand(style.spacing.margin);
    if (padding) css.padding = padding;
    if (margin) css.margin = margin;
    if (style.spacing.gap !== undefined) {
      const gapPx = px(style.spacing.gap);
      if (gapPx !== undefined) {
        css.gap = gapPx;
        (css as Record<string, unknown>)['--block-gap'] = gapPx;
      }
    }
  }

  if (style.background) {
    const bgColor = resolveColorToCss(style.background.color, '');
    if (bgColor && bgColor !== 'inherit') css.backgroundColor = bgColor;
    const grad = gradientCss(style.background.gradient);
    if (grad) {
      const layers: string[] = [grad];
      if (style.background.image?.url) layers.push(`url(${style.background.image.url})`);
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

  if (style.border) {
    if (style.border.width !== undefined) css.borderWidth = px(style.border.width);
    if (style.border.style) css.borderStyle = style.border.style;
    if (style.border.color) {
      const color = resolveColorToCss(style.border.color, '');
      if (color && color !== 'inherit') css.borderColor = color;
    }
    if (style.border.radius !== undefined) css.borderRadius = px(style.border.radius);
  }

  const shadow = shadowCss(style.shadow);
  if (shadow) css.boxShadow = shadow;

  if (style.size) {
    if (style.size.height !== undefined) css.height = style.size.height === 'auto' ? 'auto' : px(style.size.height);
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

  if (style.alignment) {
    if (style.alignment.self) css.alignSelf = style.alignment.self;
    if (style.alignment.items) css.alignItems = style.alignment.items;
    if (style.alignment.justify) {
      const map: Record<string, string> = {
        start: 'flex-start', end: 'flex-end', between: 'space-between',
        around: 'space-around', evenly: 'space-evenly',
      };
      css.justifyContent = map[style.alignment.justify] ?? style.alignment.justify;
    }
  }

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
