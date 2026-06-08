// Per-element style resolver (storefront copy). The page builder's Style tab
// (focus mode) saves per-element overrides to props.elementStyles[key]
// (e.g. elementStyles.title.color). Block components apply getElementStyle
// (props, 'title') to the matching element so those tweaks render.
//
// Mirrors packages/blocks/src/utilities/element-styles.ts (getElementStyle).
// Inlined because apps/web has no @dw-church/blocks dep; it only needs
// React's CSSProperties type.
import type { CSSProperties } from 'react';

export interface ElementStyle {
  fontSize?: string; fontWeight?: string; letterSpacing?: string; lineHeight?: string;
  color?: string; textAlign?: 'left' | 'center' | 'right';
  borderRadius?: string; aspectRatio?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  opacity?: string; maxWidth?: string; maxHeight?: string; marginInline?: string;
  marginTop?: string; marginRight?: string; marginBottom?: string; marginLeft?: string;
  paddingTop?: string; paddingRight?: string; paddingBottom?: string; paddingLeft?: string;
  textShadow?: string; boxShadow?: string; mixBlendMode?: string; transform?: string; background?: string;
}

function resolveColor(value: string): string {
  if (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl') || value.startsWith('var(')) {
    return value;
  }
  // Palette token name → brand var (legacy --dw-* as fallback).
  return `var(--brand-${value}, var(--dw-${value}, ${value}))`;
}

export function getElementStyle(
  source: { elementStyles?: Record<string, ElementStyle | undefined> } | undefined,
  key: string,
): CSSProperties {
  const o = source?.elementStyles?.[key];
  if (!o) return {};
  const out: CSSProperties = {};
  if (o.fontSize?.trim()) out.fontSize = o.fontSize.trim();
  if (o.fontWeight?.trim()) out.fontWeight = o.fontWeight.trim();
  if (o.letterSpacing?.trim()) out.letterSpacing = o.letterSpacing.trim();
  if (o.lineHeight?.trim()) out.lineHeight = o.lineHeight.trim();
  if (o.color?.trim()) out.color = resolveColor(o.color.trim());
  if (o.textAlign) out.textAlign = o.textAlign;
  if (o.borderRadius?.trim()) out.borderRadius = o.borderRadius.trim();
  if (o.aspectRatio?.trim()) out.aspectRatio = o.aspectRatio.trim();
  if (o.objectFit) out.objectFit = o.objectFit;
  if (o.opacity?.trim()) out.opacity = o.opacity.trim();
  if (o.maxWidth?.trim()) out.maxWidth = o.maxWidth.trim();
  if (o.maxHeight?.trim()) out.maxHeight = o.maxHeight.trim();
  if (o.marginInline?.trim()) out.marginInline = o.marginInline.trim();
  if (o.marginTop?.trim()) out.marginTop = o.marginTop.trim();
  if (o.marginRight?.trim()) out.marginRight = o.marginRight.trim();
  if (o.marginBottom?.trim()) out.marginBottom = o.marginBottom.trim();
  if (o.marginLeft?.trim()) out.marginLeft = o.marginLeft.trim();
  if (o.paddingTop?.trim()) out.paddingTop = o.paddingTop.trim();
  if (o.paddingRight?.trim()) out.paddingRight = o.paddingRight.trim();
  if (o.paddingBottom?.trim()) out.paddingBottom = o.paddingBottom.trim();
  if (o.paddingLeft?.trim()) out.paddingLeft = o.paddingLeft.trim();
  if (o.textShadow?.trim()) out.textShadow = o.textShadow.trim();
  if (o.boxShadow?.trim()) out.boxShadow = o.boxShadow.trim();
  if (o.mixBlendMode?.trim()) (out as Record<string, unknown>).mixBlendMode = o.mixBlendMode.trim();
  if (o.transform?.trim()) out.transform = o.transform.trim();
  if (o.background?.trim()) out.background = o.background.trim();
  return out;
}
