/**
 * SectionBackground — unified, masking-safe background layer for section
 * blocks (hero / cta / quote / text-image bg / etc.).
 *
 * Why it exists
 *   Every section that paints a background image had been hand-rolling the
 *   same 3-layer recipe (image + optional video + overlay) and each was
 *   subtly wrong:
 *     - `overflow-hidden` was only conditionally applied (often gated on
 *       `isContained`), so full-bleed variants let the image leak past
 *       the box and visually invade the next section.
 *     - ImageElement's inline `height: auto` was winning over the
 *       caller's `h-full` className, forcing native-aspect-ratio
 *       stretch that compounded the leak.
 *     - Overlay tint colour resolution + gradient mode logic was copy-
 *       pasted between ImageOverlayHero and CtaSectionBlock.
 *     - There was no operator-facing control for object-position
 *       (top / center / left / bottom-right …) so AI- or operator-
 *       supplied images always cropped from the centre even when the
 *       intent was "anchor to the top of the photo".
 *
 *   Folding all of that into one component:
 *     1. Always renders `absolute inset-0 overflow-hidden` so the image
 *        is masked inside whatever sized box the section provides — no
 *        more leaks.
 *     2. Lets the operator pick `position` from the 9-cell grid the
 *        design-tokens `backgroundImageSchema.position` already defines.
 *     3. Centralises the overlay + video layering so callers just pass
 *        their data; the box-model & z-stacking are handled here.
 *
 * The parent section is expected to be `position: relative` and to
 * supply its own height (e.g. via `min-h-[460px]` on a hero box). This
 * component fills that box.
 */

import type { CSSProperties, ReactNode } from 'react';
import { ImageElement } from './ImageElement';
import { HeroVideoBackground } from '../static/HeroVideoBackground';
import { resolveOverlayColor } from '../utilities/overlay-color';

/** Allowed object-position anchors. Mirrors the union in
 *  `@dw-church/design-tokens` `backgroundImageSchema.position` so the
 *  operator's choice flows through the same typed path as theme
 *  background tokens. */
export type SectionBackgroundPosition =
  | 'center'        // center center
  | 'top'           // top center
  | 'bottom'        // bottom center
  | 'left'          // center left
  | 'right'         // center right
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

const OBJECT_POSITION_MAP: Record<SectionBackgroundPosition, string> = {
  'center':       'center center',
  'top':          'center top',
  'bottom':       'center bottom',
  'left':         'left center',
  'right':        'right center',
  'top-left':     'left top',
  'top-right':    'right top',
  'bottom-left':  'left bottom',
  'bottom-right': 'right bottom',
};

/** Resolve a 1-of-9 anchor token into a CSS `object-position` value.
 *  Falls back to `center center` for unknown / unset input so the
 *  storefront never renders broken css. */
export function objectPositionFor(p: SectionBackgroundPosition | undefined): string {
  if (!p) return 'center center';
  return OBJECT_POSITION_MAP[p] ?? 'center center';
}

/**
 * Overlay configuration — covers both Elementor's "Classic" (single
 * colour) and "Gradient" (two colour stops + angle + type) modes.
 *
 * Operator inspector edits OverlayField → OverlayConfig → SectionBackground
 * → CSS `background-color` (classic) or `background-image: linear-gradient(...)
 * / radial-gradient(...)` (gradient).
 *
 * Legacy / minimal callers can still pass just `{ color, opacity }` —
 * mode defaults to 'classic' and `color1` is read from `color` when set.
 * Legacy `mode: 'flat' | 'gradient'` (top→bottom 1-colour scrim) maps to
 * { mode: 'classic' } / { mode: 'gradient', color1: transparent, color2: color }.
 */
export type OverlayMode = 'classic' | 'gradient' | 'flat';  // 'flat' = legacy alias for 'classic'
export type OverlayGradientType = 'linear' | 'radial';

export interface OverlayConfig {
  mode?: OverlayMode;
  /** 0–100. Multiplied into every colour stop's alpha. */
  opacity?: number;
  /** Classic mode — single colour over the whole image. Also used as
   *  the legacy `color` field when `mode === undefined`. */
  color?: string;
  /** Gradient mode — first colour stop. Defaults to transparent if
   *  unset, mirroring Elementor's behaviour. */
  color1?: string;
  /** Gradient mode — first stop's position (% from start). Default 0. */
  location1?: number;
  /** Gradient mode — second colour stop. Defaults to the legacy `color`
   *  when unset, so callers that only know one colour still gradient. */
  color2?: string;
  /** Gradient mode — second stop's position (% from start). Default 100. */
  location2?: number;
  /** 'linear' (default) or 'radial'. Linear uses `angle`, radial centres. */
  gradientType?: OverlayGradientType;
  /** Gradient mode — angle in degrees (0–360). Default 180 (top→bottom). */
  angle?: number;
}

/**
 * Resolve an OverlayConfig (or undefined) into a CSSProperties object
 * suitable to spread on the overlay div. Returns undefined when the
 * config doesn't yield a visible overlay (no colours / fully transparent).
 *
 * Mode dispatch:
 *   - 'classic' (or 'flat' alias): single `background-color`.
 *   - 'gradient' linear: `background-image: linear-gradient(angle, c1 loc1%, c2 loc2%)`.
 *   - 'gradient' radial: `background-image: radial-gradient(circle, c1 loc1%, c2 loc2%)`.
 *
 * Opacity (0–100) is multiplied into every stop's alpha via the existing
 * `resolveOverlayColor` helper so the operator can dial the whole
 * overlay translucent with one knob.
 */
/**
 * Readability fallback overlay — top-black → bottom-transparent linear
 * gradient at 30% opacity. Applied when a background image is present
 * but the operator hasn't picked any overlay color. Without it, white
 * headings on bright photos are unreadable. Any operator-set color
 * (color / color1 / color2) suppresses this — operator intent wins.
 *
 * Distinct from a hardcoded design default: this is a readability
 * baseline, not a stylistic prescription, and it yields immediately
 * when the operator touches any overlay knob. The earlier per-block
 * '#000000 55%' scrim was non-overridable and lived inside a single
 * block — that's the kind of hardcoding feedback-no-hardcoded-defaults
 * forbids.
 */
const READABILITY_FALLBACK_OVERLAY: OverlayConfig = {
  mode: 'gradient',
  gradientType: 'linear',
  opacity: 30,
  color1: '#000000',
  color2: 'transparent',
  angle: 180,
  location1: 0,
  location2: 100,
};

function overlayHasColor(overlay: OverlayConfig | undefined): boolean {
  if (!overlay) return false;
  return Boolean(
    (overlay.color && overlay.color.trim()) ||
    (overlay.color1 && overlay.color1.trim()) ||
    (overlay.color2 && overlay.color2.trim()),
  );
}

function buildOverlayStyle(overlay: OverlayConfig | undefined): CSSProperties | undefined {
  if (!overlay) return undefined;
  const alpha = Math.min(100, Math.max(0, overlay.opacity ?? 50)) / 100;
  const mode: OverlayMode = overlay.mode ?? 'classic';

  if (mode === 'classic' || mode === 'flat') {
    const color = overlay.color ?? overlay.color1 ?? '';
    if (!color && alpha === 0) return undefined;
    return { backgroundColor: resolveOverlayColor(color, alpha) };
  }

  // gradient
  // color1 defaults to transparent (legacy "top→transparent" recipe);
  // color2 falls back to the legacy single `color` field.
  const color1 = overlay.color1 ?? 'transparent';
  const color2 = overlay.color2 ?? overlay.color ?? '';
  const loc1 = Math.min(100, Math.max(0, overlay.location1 ?? 0));
  const loc2 = Math.min(100, Math.max(0, overlay.location2 ?? 100));
  const stop1 = `${resolveOverlayColor(color1, alpha)} ${loc1}%`;
  const stop2 = `${resolveOverlayColor(color2, alpha)} ${loc2}%`;

  if (overlay.gradientType === 'radial') {
    return { backgroundImage: `radial-gradient(circle, ${stop1}, ${stop2})` };
  }
  const angle = overlay.angle ?? 180;
  return { backgroundImage: `linear-gradient(${angle}deg, ${stop1}, ${stop2})` };
}

/** Pull the 11-char video id out of any common YouTube URL form. */
function youtubeId(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([^&?\s/]+)/,
  );
  return m?.[1] ?? null;
}

export interface SectionBackgroundProps {
  /** Desktop background image URL. Empty → image layer is skipped (a
   *  brand-gradient fallback paints underneath if the section paints one). */
  imageUrl?: string;
  /** Optional mobile-only image (9:16 portrait). Emits a <picture> source
   *  for <=767px viewports. */
  mobileImageUrl?: string;
  /** Optional ambient YouTube video URL — layered above the still image
   *  via the existing HeroVideoBackground component (autoplay · muted ·
   *  looped). The image stays as poster / fallback. */
  videoUrl?: string;
  /** Object-position anchor — 1 of the 9-cell grid. Default 'center'. */
  position?: SectionBackgroundPosition;
  /** Overlay tint. See `OverlayConfig` for the full schema (classic
   *  single-colour vs. multi-stop gradient with angle / type controls
   *  — mirrors Elementor's Background Overlay editor). */
  overlay?: OverlayConfig;
  /** Rounded-corner mask. '2xl' (=16px) for page-hero, '3xl' (=24px)
   *  for hero / cta image-overlay. Omitted → square. */
  rounded?: '2xl' | '3xl';
  /** Owning section's props bag — forwarded to ImageElement so per-
   *  element overrides (operator's elementStyles[<key>]) still apply. */
  props: Record<string, unknown>;
  /** Stable elementKey. Defaults to 'backgroundImageUrl' which is what
   *  the registry exposes for hero / cta / quote. */
  elementKey?: string;
  /** Responsive srcset slot. 'hero-bg' for full-bleed heroes, 'split-side'
   *  for half-and-half layouts. */
  sizeCategory?: 'hero-bg' | 'split-side';
  /** Above-the-fold LCP candidate — sets fetchpriority=high + loading=eager. */
  isLcp?: boolean;
  /** Additional content layered above image+overlay (rarely used —
   *  callers usually paint their own content layer outside this
   *  component). */
  children?: ReactNode;
}

/**
 * Render the image + (optional) video + (optional) overlay inside an
 * absolutely positioned, overflow-clipped layer.
 *
 * Place this as the FIRST child of a `position: relative` parent that
 * has a known height (min-height counts). The component fills that box
 * exactly and clips anything that would otherwise spill.
 */
export function SectionBackground({
  imageUrl,
  mobileImageUrl,
  videoUrl,
  position,
  overlay,
  rounded,
  props,
  elementKey = 'backgroundImageUrl',
  sizeCategory = 'hero-bg',
  isLcp = false,
  children,
}: SectionBackgroundProps) {
  const videoIdResolved = youtubeId(videoUrl);
  const hasImage = Boolean(imageUrl);
  const hasVideo = Boolean(videoIdResolved);
  // Overlay paints when there's any media underneath to tint — pure
  // overlay on an empty background reads as a "block colour" which
  // belongs in BlockStyle.background, not here.
  // Readability fallback: media present + no operator overlay color →
  // top-black → transparent 30% gradient so headings stay legible.
  const effectiveOverlay: OverlayConfig | undefined =
    (hasImage || hasVideo) && !overlayHasColor(overlay)
      ? READABILITY_FALLBACK_OVERLAY
      : overlay;
  const overlayStyle = hasImage || hasVideo ? buildOverlayStyle(effectiveOverlay) : undefined;
  const hasOverlay = Boolean(overlayStyle);

  const roundedClass = rounded ? `rounded-${rounded}` : '';
  const objectPosition = objectPositionFor(position);

  return (
    <div
      className={`absolute inset-0 overflow-hidden ${roundedClass}`.trim()}
      aria-hidden="true"
    >
      {hasImage && (
        <ImageElement
          url={imageUrl!}
          mobileUrl={mobileImageUrl}
          alt=""
          props={props}
          elementKey={elementKey}
          sizeCategory={sizeCategory}
          imageFetchPriority={isLcp ? 'high' : undefined}
          imageLoading={isLcp ? 'eager' : 'lazy'}
          fillParent
          className="absolute inset-0 w-full h-full object-cover"
          baseStyle={{ objectPosition }}
        />
      )}
      {hasVideo && (
        <HeroVideoBackground
          videoId={videoIdResolved!}
          rounded={Boolean(rounded)}
          posterUrl={imageUrl || undefined}
        />
      )}
      {hasOverlay && (
        <div className="absolute inset-0" style={overlayStyle} />
      )}
      {children}
    </div>
  );
}
