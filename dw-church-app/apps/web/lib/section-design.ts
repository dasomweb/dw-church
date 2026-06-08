// Section design resolver — the SINGLE source of truth for section-level
// design, read from FLAT props (the keys the page-builder Style tab writes:
// backgroundColor, backgroundImageUrl, overlay*, height, width, contentWidth,
// border*, textAlign…). BlockRenderer applies this to every section wrapper
// so design applies uniformly regardless of which block renders inside.
//
// This replaces the earlier structured-blockStyle wrapper: the inspector
// writes flat props, so the renderer reads flat props — one system, no drift.
import type { CSSProperties } from 'react';

function resolveColor(v: string | undefined): string | undefined {
  if (!v) return undefined;
  if (v.startsWith('#') || v.startsWith('rgb') || v.startsWith('hsl') || v.startsWith('var(')) return v;
  return `var(--brand-${v}, var(--dw-${v}, ${v}))`;
}

// Height preset → min-height (lower bound of the inspector's labelled ranges).
const HEIGHT_PX: Record<string, string> = {
  xs: '140px', sm: '220px', 'sm-plus': '300px', md: '400px', 'md-plus': '460px',
  lg: '520px', 'lg-plus': '600px', xl: '660px', full: '100vh',
};
const CONTENT_MAXW: Record<string, string> = {
  narrow: '768px', contained: '1024px', default: '1024px', wide: '1280px', full: '100%',
};

export interface SectionDesign {
  /** Styles for the outer section wrapper. */
  wrapper: CSSProperties;
  /** CSS `background` for the overlay layer, or null when no overlay set. */
  overlay: string | null;
  /** Styles for the inner content container (content width + text align). */
  content: CSSProperties;
  /** True when any design prop is set (so BlockRenderer can skip the extra
   *  wrapper markup entirely for untouched sections). */
  active: boolean;
}

export function resolveSectionDesign(props: Record<string, unknown>): SectionDesign {
  const p = props as Record<string, any>;
  const wrapper: CSSProperties = {};
  const content: CSSProperties = {};

  // ─── Background ────────────────────────────────────────────────────
  const bgColor = resolveColor(p.backgroundColor);
  if (bgColor) wrapper.backgroundColor = bgColor;
  if (typeof p.backgroundImageUrl === 'string' && p.backgroundImageUrl) {
    wrapper.backgroundImage = `url(${p.backgroundImageUrl})`;
    wrapper.backgroundSize = 'cover';
    wrapper.backgroundPosition = (p.backgroundImagePosition as string) || 'center';
    wrapper.backgroundRepeat = 'no-repeat';
  }

  // ─── Height ────────────────────────────────────────────────────────
  if (p.height && HEIGHT_PX[p.height]) {
    wrapper.minHeight = HEIGHT_PX[p.height];
    wrapper.display = 'flex';
    wrapper.flexDirection = 'column';
    wrapper.justifyContent = 'center';
  }

  // ─── Background-box width ──────────────────────────────────────────
  // 'contained' centers the section box; 'full-bleed' spans edge to edge.
  if (p.width === 'contained') {
    wrapper.maxWidth = '1280px';
    wrapper.marginInline = 'auto';
  }

  // ─── Border ────────────────────────────────────────────────────────
  if (typeof p.borderWidth === 'number' && p.borderWidth > 0) {
    wrapper.borderStyle = (p.borderType as string) || 'solid';
    wrapper.borderWidth = `${p.borderWidth}px`;
    const bc = resolveColor(p.borderColor);
    if (bc) wrapper.borderColor = bc;
  }
  const r = (k: string) => (typeof p[k] === 'number' ? `${p[k]}px` : undefined);
  const rt = r('borderRadiusTop'), rr = r('borderRadiusRight'), rb = r('borderRadiusBottom'), rl = r('borderRadiusLeft');
  if (rt || rr || rb || rl) {
    wrapper.borderTopLeftRadius = rt ?? '0';
    wrapper.borderTopRightRadius = rr ?? '0';
    wrapper.borderBottomRightRadius = rb ?? '0';
    wrapper.borderBottomLeftRadius = rl ?? '0';
    wrapper.overflow = 'hidden';
  }

  // ─── Content container ─────────────────────────────────────────────
  if (p.contentWidth && CONTENT_MAXW[p.contentWidth]) {
    content.maxWidth = CONTENT_MAXW[p.contentWidth];
    content.marginInline = 'auto';
  }
  const align = (p.textAlign ?? p.align) as string | undefined;
  if (align) content.textAlign = align as CSSProperties['textAlign'];

  // ─── Overlay ───────────────────────────────────────────────────────
  let overlay: string | null = null;
  const opacity = typeof p.overlayOpacity === 'number' ? p.overlayOpacity / 100 : null;
  if (p.overlayMode === 'gradient' && (p.overlayColor1 || p.overlayColor2)) {
    const c1 = resolveColor(p.overlayColor1) || 'rgba(0,0,0,0)';
    const c2 = resolveColor(p.overlayColor2) || 'rgba(0,0,0,0.5)';
    overlay = `linear-gradient(${typeof p.overlayAngle === 'number' ? p.overlayAngle : 180}deg, ${c1} ${p.overlayLocation1 ?? 0}%, ${c2} ${p.overlayLocation2 ?? 100}%)`;
  } else if (p.overlayColor && opacity !== null && opacity > 0) {
    const c = resolveColor(p.overlayColor) || '#000';
    overlay = hexToRgba(c, opacity);
  }

  const active = Object.keys(wrapper).length > 0 || Object.keys(content).length > 0 || overlay !== null;
  return { wrapper, overlay, content, active };
}

function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex; // already rgb/var/etc — caller wraps in a layer at given opacity via opacity prop
  const [r, g, b] = [parseInt(m[1]!, 16), parseInt(m[2]!, 16), parseInt(m[3]!, 16)];
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
