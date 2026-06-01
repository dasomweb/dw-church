/**
 * Shared section-shell helpers — extracts the height / textAlign / width /
 * contentWidth / overlay / border prop projections so every section block
 * uses the same vocabulary (HERO / CTA / QUOTE 가 이미 같은 prop 이름을
 * 쓰고, 이제 TextImage / TextOnly / Features / Testimonials 도 합류).
 *
 * Block components import these and the matching <SectionBackground />
 * element to render bg image + overlay + border with one consistent layer
 * stack. Inspector pairs them with LayoutField / DesignField / OverlayField
 * / BorderField (multi-prop) — they all read/write the SAME flat top-level
 * props this module projects.
 *
 * No JSX here — pure projections + small CSSProperties builders. JSX
 * stays inside the block components so layout-specific decisions (split
 * grid, single-column, alternating, etc.) are visible at the call site.
 */

import type { CSSProperties } from 'react';
import type { OverlayConfig, OverlayGradientType, OverlayMode, SectionBackgroundPosition } from '../elements';

// Heights map — mobile uses svh so iOS doesn't trim by browser chrome.
// 9 steps (대표님 2026-05-27 정정): sm~lg 사이가 너무 듬성듬성해서
// 중간값 (sm-plus / md-plus / lg-plus) 추가, 2xl / half / three-quarter
// 는 폐기.
export const SECTION_HEIGHT_MAP: Record<string, string> = {
  xs:        'min-h-[120px] sm:min-h-[160px]',
  sm:        'min-h-[200px] sm:min-h-[260px]',
  'sm-plus': 'min-h-[280px] sm:min-h-[340px]',
  md:        'min-h-[360px] sm:min-h-[460px]',
  'md-plus': 'min-h-[420px] sm:min-h-[520px]',
  lg:        'min-h-[480px] sm:min-h-[600px]',
  'lg-plus': 'min-h-[540px] sm:min-h-[660px]',
  xl:        'min-h-[600px] sm:min-h-[720px]',
  full:      'min-h-[88svh] sm:min-h-screen',
};

export const SECTION_ALIGN_MAP: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

/**
 * Resolve outer background width. Operator picks 'contained' to wrap the
 * background+overlay in mx-auto max-w-7xl + rounded corners; 'full-bleed'
 * (default) lets the background extend to the viewport edges.
 *
 * Legacy: pre-v0.4 hero rows stored `layout='contained'` instead of
 * `width='contained'`. Read both for backward compat.
 */
export function resolveSectionWidth(
  props: Record<string, unknown>,
): 'contained' | 'full-bleed' {
  const width = props.width as string | undefined;
  if (width === 'contained' || width === 'full-bleed') return width;
  return props.layout === 'contained' ? 'contained' : 'full-bleed';
}

/**
 * Resolve INNER content wrapper width (text / cta stack). Independent of
 * the outer background. Default 'contained' — text shouldn't smack the
 * viewport edge even when the background bleeds.
 */
export function resolveContentWidth(
  props: Record<string, unknown>,
): 'contained' | 'full-bleed' {
  const cw = props.contentWidth as string | undefined;
  return cw === 'full-bleed' ? 'full-bleed' : 'contained';
}

/** Tailwind class fragment for content wrapper container width.
 *  반드시 좌우 px 를 포함해야 함 — 빠지면 SectionShell 이 이 클래스로
 *  defaultContentClass(px 포함)를 덮어쓰면서 모바일에서 본문이 화면
 *  양끝에 붙음 (max-w-7xl 은 모바일 뷰포트보다 커서 폭 제한이 안 됨).
 *  대표님 2026-05-29: 본문 섹션 좌우 여백이 전혀 안 먹던 문제. */
export function contentWidthClass(
  contentWidth: 'contained' | 'full-bleed',
): string {
  return contentWidth === 'contained'
    ? 'mx-auto max-w-7xl px-4 sm:px-6'
    : 'px-4 sm:px-6';
}

/** Read textAlign with backward-compat for CTA's legacy `align` key. */
export function resolveTextAlign(props: Record<string, unknown>): string {
  return (props.textAlign as string) || (props.align as string) || 'left';
}

/**
 * Project operator-edited overlay-* props onto an OverlayConfig the
 * SectionBackground component understands. Same fields HeroBannerBlock /
 * CtaSectionBlock / QuoteBlock read — moved here so new blocks (TextImage
 * etc.) get identical behavior for free.
 *
 * Legacy callers that only set overlayColor / overlayOpacity / overlayMode
 * ('flat' | 'gradient') still produce a sensible OverlayConfig.
 */
export function readOverlayProps(props: Record<string, unknown>): OverlayConfig {
  return {
    mode: (props.overlayMode as OverlayMode | undefined) ?? 'classic',
    opacity: typeof props.overlayOpacity === 'number' ? (props.overlayOpacity as number) : 50,
    color: (props.overlayColor as string) || '',
    color1: (props.overlayColor1 as string) || undefined,
    color2: (props.overlayColor2 as string) || undefined,
    location1: typeof props.overlayLocation1 === 'number' ? (props.overlayLocation1 as number) : undefined,
    location2: typeof props.overlayLocation2 === 'number' ? (props.overlayLocation2 as number) : undefined,
    gradientType: props.overlayGradientType as OverlayGradientType | undefined,
    angle: typeof props.overlayAngle === 'number' ? (props.overlayAngle as number) : undefined,
  };
}

/** Returns true when the section has any background source (image/video). */
export function hasSectionBackground(props: Record<string, unknown>): boolean {
  return Boolean(
    (props.backgroundImageUrl as string) ||
    (props.backgroundVideoUrl as string),
  );
}

export function readBackgroundPosition(
  props: Record<string, unknown>,
): SectionBackgroundPosition | undefined {
  return props.backgroundImagePosition as SectionBackgroundPosition | undefined;
}

/**
 * Project the 7 BorderField props (borderType / borderWidth / borderColor
 * / borderRadiusTop / Right / Bottom / Left) onto a CSSProperties block
 * suitable for inline `style={...}`. Empty / 'none' / 'default' borderType
 * returns just the radius if present.
 */
export function buildSectionBorderStyle(props: Record<string, unknown>): CSSProperties {
  const out: CSSProperties = {};
  const type = props.borderType as string | undefined;
  const width = typeof props.borderWidth === 'number' ? props.borderWidth : undefined;
  const color = (props.borderColor as string) || undefined;
  if (type && type !== 'none' && type !== 'default' && width && color) {
    out.border = `${width}px ${type} ${color}`;
  }
  const top = typeof props.borderRadiusTop === 'number' ? props.borderRadiusTop : undefined;
  const right = typeof props.borderRadiusRight === 'number' ? props.borderRadiusRight : undefined;
  const bottom = typeof props.borderRadiusBottom === 'number' ? props.borderRadiusBottom : undefined;
  const left = typeof props.borderRadiusLeft === 'number' ? props.borderRadiusLeft : undefined;
  if (top !== undefined || right !== undefined || bottom !== undefined || left !== undefined) {
    const t = top ?? 0;
    const r = right ?? 0;
    const b = bottom ?? 0;
    const l = left ?? 0;
    out.borderRadius = `${t}px ${r}px ${b}px ${l}px`;
  }
  return out;
}
