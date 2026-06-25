/**
 * Hero banner — 4 variants in a single block_type.
 *
 *   image-overlay  : full-bleed background image with text overlay (home default)
 *   split-image    : 50/50 text + side image (services / about parents)
 *   page-hero      : compact sub-page header strip (default for sub-pages)
 *   text-only      : no image, color/gradient bg (minimal sites)
 *
 * Legacy hero_banner rows (no variant prop) are routed by legacyVariantFrom()
 * so existing tenants keep rendering exactly as before.
 *
 * Width modes — `width` is the new prop, `layout` ('full' | 'contained') is
 * the back-compat shim that pre-v0.4 rows still carry.
 *
 * Phase-2 element-composition refactor: typography, button, eyebrow, and
 * image markup are delegated to the reusable element modules
 * (HeadingElement / EyebrowElement / ButtonElement / ImageElement) so this
 * file holds only the structural shell (variant dispatch, layout grid,
 * overlay layer, height tokens). No hardcoded copy fallbacks, no
 * max-w/mx-auto inner caps, no hex colors — those decisions live in
 * operator-supplied props.elementStyles / elementTags / elementVariants
 * or in the brand token CSS variables.
 */

import { HeadingElement, EyebrowElement, ButtonElement, ImageElement, SectionBackground } from '../elements';
import type { SectionBackgroundPosition } from '../elements';
import {
  SECTION_HEIGHT_MAP,
  SECTION_ALIGN_MAP,
  resolveSectionWidth,
  resolveContentWidth as resolveSectionContentWidth,
  contentWidthClass as sectionContentWidthClass,
  readOverlayProps as readSectionOverlayProps,
} from '../utilities/section-shell';

interface HeroBannerBlockProps {
  props: Record<string, unknown>;
  slug?: string;
}

type Variant = 'image-overlay' | 'split-image' | 'page-hero' | 'text-only';

// HEIGHT_MAP / ALIGN_MAP / resolveWidth / resolveContentWidth /
// contentWidthClass / readOverlayProps 는 모두 utilities/section-shell.ts
// 로 통합됨 (다른 section block 들도 같은 vocab 사용). 아래 const 와
// 로컬 헬퍼는 그 export 의 thin wrapper — 호출처 (HeroBannerBlock 내부)
// 의 식별자 이름은 유지하면서 중복 코드는 0.
const HEIGHT_MAP = SECTION_HEIGHT_MAP;
const ALIGN_MAP = SECTION_ALIGN_MAP;

const resolveWidth = resolveSectionWidth;
const resolveContentWidth = resolveSectionContentWidth;
const contentWidthClass = sectionContentWidthClass;
const readOverlayProps = readSectionOverlayProps;

/**
 * For pre-v0.4 rows (no `variant` field), infer the variant from prop shape.
 * Keeps every existing tenant site visually identical.
 */
function legacyVariantFrom(props: Record<string, unknown>): Variant {
  if (props.variant) return props.variant as Variant;
  // height='sm' + no bg → page-hero
  if (props.height === 'sm' && !props.backgroundImageUrl) return 'page-hero';
  // imageUrl filled but no bg → split-image
  if (props.imageUrl && !props.backgroundImageUrl) return 'split-image';
  // No image at all → text-only
  if (!props.backgroundImageUrl && !props.imageUrl) return 'text-only';
  // Default: image-overlay (current behavior).
  return 'image-overlay';
}

/* ─── Main dispatcher ──────────────────────────────────────── */

export function HeroBannerBlock({ props, slug }: HeroBannerBlockProps) {
  const variant = legacyVariantFrom(props);
  switch (variant) {
    case 'split-image':
      return <SplitImageHero props={props} slug={slug} />;
    case 'page-hero':
      return <PageHero props={props} slug={slug} />;
    case 'text-only':
      return <TextOnlyHero props={props} slug={slug} />;
    case 'image-overlay':
    default:
      return <ImageOverlayHero props={props} slug={slug} />;
  }
}

/* ─── Shared CTA pair ──────────────────────────────────────── */

function CtaPair({ props }: { props: Record<string, unknown> }) {
  const primaryText = (props.buttonText as string) || (props.ctaLabel as string) || '';
  const primaryUrl = (props.buttonUrl as string) || (props.ctaUrl as string) || '';
  const primaryNewTab = props.buttonNewTab === true;
  const secondaryText = (props.secondaryButtonText as string) || '';
  const secondaryUrl = (props.secondaryButtonUrl as string) || '';
  const secondaryNewTab = props.secondaryButtonNewTab === true;
  if (!primaryText && !secondaryText) return null;
  return (
    <div className="mt-7 flex gap-3 flex-wrap items-center">
      <ButtonElement
        text={primaryText}
        href={primaryUrl}
        target={primaryNewTab ? '_blank' : undefined}
        props={props}
        elementKey="buttonText"
        defaultVariant="filled"
      />
      <ButtonElement
        text={secondaryText}
        href={secondaryUrl}
        target={secondaryNewTab ? '_blank' : undefined}
        props={props}
        elementKey="secondaryButtonText"
        defaultVariant="outlined"
      />
    </div>
  );
}

/* ─── 1. image-overlay (full-bleed bg + text overlay) ──────── */

function ImageOverlayHero({ props }: HeroBannerBlockProps) {
  const eyebrow = (props.eyebrow as string) || '';
  const title = (props.title as string) || '';
  const subtitle = (props.subtitle as string) || '';
  const bgImage = (props.backgroundImageUrl as string) || '';
  const bgImageMobile = (props.backgroundImageUrlMobile as string) || undefined;
  const bgVideoUrl = (props.backgroundVideoUrl as string) || '';
  const bgImagePosition = (props.backgroundImagePosition as SectionBackgroundPosition | undefined);
  const height = (props.height as string) || 'lg';
  const textAlign = (props.textAlign as string) || 'center';
  // Overlay config — operator can drive a classic single-colour scrim
  // OR a 2-stop gradient (linear / radial, configurable angle + locations).
  // All fields are individual props on the section so the inspector can
  // edit each one independently. Legacy callers that only set overlay
  // Color / Opacity / Mode still work — SectionBackground falls back to
  // sensible defaults when the new fields are unset.
  const overlay = readOverlayProps(props);

  const heightClass = HEIGHT_MAP[height] || HEIGHT_MAP.lg;
  const alignClass = ALIGN_MAP[textAlign] || ALIGN_MAP.center;
  const isContained = resolveWidth(props) === 'contained';
  const contentWidth = resolveContentWidth(props);
  const hasBg = Boolean(bgImage) || Boolean(bgVideoUrl);

  return (
    <section className={`relative ${isContained ? 'px-4 sm:px-6 py-8' : ''}`}>
      <div
        className={`relative flex ${heightClass} items-center justify-center bg-gradient-to-br from-[var(--dw-primary)] to-[var(--dw-secondary)] overflow-hidden ${isContained ? 'mx-auto max-w-7xl rounded-3xl' : ''}`}
      >
        {/* Brand-gradient base (theme tokens, NOT a hardcoded colour) shows
         * while the LCP background image is still downloading — no black
         * flash. SectionBackground paints the image/video/overlay on top
         * inside its own absolute+overflow-hidden masking layer. */}
        {hasBg ? (
          <SectionBackground
            imageUrl={bgImage || undefined}
            mobileImageUrl={bgImageMobile}
            videoUrl={bgVideoUrl || undefined}
            position={bgImagePosition}
            overlay={overlay}
            rounded={isContained ? '3xl' : undefined}
            props={props}
            sizeCategory="hero-bg"
            isLcp
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--dw-primary)] to-[var(--dw-secondary)]" />
        )}
        {/* Content wrapper — padding + z-index only. NO max-w / mx-auto:
         * operator's elementStyles.title.maxWidth (set via the inspector's
         * "크기 · 가로 위치" panel) controls how wide the headline gets.
         * flex-col + var(--block-gap) lets the section BlockStyle.spacing.gap
         * flow to the gap between eyebrow / title / subtitle / cta. */}
        <div
          className={`relative z-10 px-6 sm:px-10 py-12 sm:py-16 w-full ${contentWidthClass(contentWidth)} ${alignClass}`}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--block-gap, 1rem)' }}
        >
          <EyebrowElement
            text={eyebrow}
            props={props}
            elementKey="eyebrow"
          />
          <HeadingElement
            text={title}
            props={props}
            elementKey="title"
            defaultTag="h1"
            defaultSize="h1"
          />
          <HeadingElement
            text={subtitle}
            props={props}
            elementKey="subtitle"
            defaultTag="h5"
            defaultSize="h4"
          />
          <CtaPair props={props} />
        </div>
      </div>
    </section>
  );
}

/* ─── 2. split-image (50/50 text + side image) ─────────────── */

function SplitImageHero({ props }: HeroBannerBlockProps) {
  const eyebrow = (props.eyebrow as string) || '';
  const title = (props.title as string) || '';
  const subtitle = (props.subtitle as string) || '';
  const description = (props.description as string) || '';
  const imageUrl = (props.imageUrl as string) || '';
  const imageSide = (props.imageSide as string) === 'left' ? 'left' : 'right';
  const height = (props.height as string) || 'md';
  // Default ON for contained layout (matches the rounded-card aesthetic
  // in InteriorStudio / Stanislav references), OFF for full-bleed where
  // the image edge runs to the viewport.
  const isContained = resolveWidth(props) === 'contained';
  const imageRoundedDefault = isContained;
  const imageRounded = props.imageRounded === undefined ? imageRoundedDefault : Boolean(props.imageRounded);

  const heightClass = HEIGHT_MAP[height] || HEIGHT_MAP.md;
  const reversed = imageSide === 'left';
  // Eyebrow takes precedence; if no eyebrow but there's a short uppercase
  // subtitle, render the subtitle as the legacy eyebrow (existing tenants).
  const renderLegacyEyebrow = !eyebrow && subtitle && subtitle.length <= 40;
  const eyebrowText = eyebrow || (renderLegacyEyebrow ? subtitle : '');

  const textCol = (
    <div
      className="flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-14 sm:py-20"
      style={{ gap: 'var(--block-gap, 1rem)' }}
    >
      <EyebrowElement
        text={eyebrowText}
        props={props}
        elementKey="eyebrow"
      />
      <HeadingElement
        text={title}
        props={props}
        elementKey="title"
        defaultTag="h1"
        defaultSize="h1"
      />
      {!renderLegacyEyebrow && (
        <HeadingElement
          text={subtitle}
          props={props}
          elementKey="subtitle"
          defaultTag="h5"
          defaultSize="h4"
        />
      )}
      <HeadingElement
        text={description}
        props={props}
        elementKey="description"
        defaultTag="p"
        defaultSize="body"
      />
      <CtaPair props={props} />
    </div>
  );

  const imageRoundedClass = imageRounded ? 'rounded-3xl' : '';
  const imgCol = imageUrl ? (
    <div className={`relative bg-gray-100 overflow-hidden ${imageRoundedClass} ${imageRounded ? 'm-4 sm:m-6' : ''}`}>
      <ImageElement
        url={imageUrl}
        alt=""
        props={props}
        elementKey="imageUrl"
        sizeCategory="split-side"
        imageFetchPriority="high"
        imageLoading="eager"
        fillParent
        className={`absolute inset-0 w-full h-full object-cover ${imageRoundedClass}`}
        baseStyle={{ aspectRatio: '4 / 3' }}
      />
    </div>
  ) : (
    <div className={`bg-gradient-to-br from-[var(--dw-primary)] to-[var(--dw-secondary)] opacity-20 ${imageRoundedClass} ${imageRounded ? 'm-4 sm:m-6' : ''}`} />
  );

  return (
    <section className={isContained ? 'px-4 sm:px-6 py-8' : ''}>
      <div
        className={`grid grid-cols-1 md:grid-cols-2 ${heightClass} bg-white overflow-hidden ${isContained ? 'mx-auto max-w-7xl rounded-3xl border border-gray-200' : ''}`}
      >
        {reversed ? (
          <>
            {imgCol}
            {textCol}
          </>
        ) : (
          <>
            {textCol}
            {imgCol}
          </>
        )}
      </div>
    </section>
  );
}

/* ─── 3. page-hero (compact sub-page header strip) ─────────── */

function PageHero({ props }: HeroBannerBlockProps) {
  const eyebrow = (props.eyebrow as string) || '';
  const title = (props.title as string) || '';
  const subtitle = (props.subtitle as string) || '';
  const bgImage = (props.backgroundImageUrl as string) || '';
  const bgImageMobile = (props.backgroundImageUrlMobile as string) || undefined;
  const bgImagePosition = (props.backgroundImagePosition as SectionBackgroundPosition | undefined);
  const textAlign = (props.textAlign as string) || 'left';
  const breadcrumb = props.breadcrumb === true;
  // PageHero defaults to opacity 60 (heavier scrim than ImageOverlay) so
  // operator-set overlay reads even on busy hero photos. readOverlayProps
  // pulls all overlay-* keys (classic + gradient mode) off the props bag.
  const overlay = { ...readOverlayProps(props), opacity:
    typeof props.overlayOpacity === 'number' ? (props.overlayOpacity as number) : 60 };

  // page-hero is a compact sub-page strip, so it defaults to 'sm' — but it must
  // honor the operator's Height (Style → Layout → Height) like every other
  // variant. Previously this was a hardcoded min-h-[240px] sm:min-h-[300px], so
  // height edits silently did nothing on AI-generated sub-page heroes (which the
  // builder emits as variant='page-hero').
  const height = (props.height as string) || 'sm';
  const heightClass = HEIGHT_MAP[height] || HEIGHT_MAP.sm;
  const alignClass = ALIGN_MAP[textAlign] || ALIGN_MAP.left;
  const isContained = resolveWidth(props) === 'contained';
  const contentWidth = resolveContentWidth(props);

  return (
    <section className={isContained ? 'px-4 sm:px-6 py-4' : ''}>
      <div
        className={`relative flex ${heightClass} items-center overflow-hidden ${isContained ? 'mx-auto max-w-7xl rounded-2xl' : ''}`}
      >
        {bgImage ? (
          <SectionBackground
            imageUrl={bgImage}
            mobileImageUrl={bgImageMobile}
            position={bgImagePosition}
            overlay={overlay}
            rounded={isContained ? '2xl' : undefined}
            props={props}
            sizeCategory="hero-bg"
            isLcp
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--dw-primary)]/10 to-[var(--dw-secondary)]/5" />
        )}
        <nav className="sr-only" aria-label="Breadcrumb">
          {breadcrumb && (
            <ol>
              <li><a href="/">Home</a></li>
              <li aria-current="page">{title}</li>
            </ol>
          )}
        </nav>
        {/* Content wrapper — padding + z-index only. Width capping is
         * delegated to elementStyles.title.maxWidth on the operator side.
         * flex-col + var(--block-gap) lets BlockStyle.spacing.gap drive
         * the gap between eyebrow / title / subtitle. */}
        <div
          className={`relative z-10 w-full px-6 sm:px-10 py-10 ${contentWidthClass(contentWidth)} ${alignClass}`}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--block-gap, 0.5rem)' }}
        >
          <EyebrowElement
            text={eyebrow}
            props={props}
            elementKey="eyebrow"
          />
          {breadcrumb && !eyebrow && (
            <nav className="opacity-75" aria-hidden="true" style={{ fontSize: 'var(--fs-xs)' }}>
              <a href="/" className="hover:underline">Home</a>
              <span className="mx-1">/</span>
              <span>{title}</span>
            </nav>
          )}
          <HeadingElement
            text={title}
            props={props}
            elementKey="title"
            defaultTag="h1"
            defaultSize="h2"
          />
          <HeadingElement
            text={subtitle}
            props={props}
            elementKey="subtitle"
            defaultTag="h5"
            defaultSize="h4"
          />
        </div>
      </div>
    </section>
  );
}

/* ─── 4. text-only (no image, color/gradient bg) ──────────── */

function TextOnlyHero({ props }: HeroBannerBlockProps) {
  const eyebrow = (props.eyebrow as string) || '';
  const title = (props.title as string) || '';
  const subtitle = (props.subtitle as string) || '';
  const height = (props.height as string) || 'md';
  const textAlign = (props.textAlign as string) || 'center';
  const bgMode = (props.bgMode as string) || 'color';

  const heightClass = HEIGHT_MAP[height] || HEIGHT_MAP.md;
  const alignClass = ALIGN_MAP[textAlign] || ALIGN_MAP.center;
  const isContained = resolveWidth(props) === 'contained';
  const contentWidth = resolveContentWidth(props);
  // Brand-token-driven background — gradient between brand tokens or the
  // surface token. Foreground color is NOT forced (was hardcoded
  // text-white before); HeadingElement/EyebrowElement each carry their
  // own color overrides via elementStyles.
  const bgClass =
    bgMode === 'gradient'
      ? 'bg-gradient-to-br from-[var(--dw-primary)] to-[var(--dw-secondary)]'
      : 'bg-[var(--dw-surface,#fafafa)]';

  return (
    <section className={isContained ? 'px-4 sm:px-6 py-8' : ''}>
      <div
        className={`flex ${heightClass} items-center justify-center ${bgClass} ${isContained ? 'mx-auto max-w-7xl rounded-3xl' : ''}`}
      >
        {/* Content wrapper — padding + alignment + container width cap.
         * The operator's `contentWidth` prop decides whether this wrapper
         * stays full-bleed (text snaps to viewport padding) or sits inside
         * a max-w-7xl container (default — common hero pattern of
         * image-풀폭 + 텍스트 contained). */}
        <div
          className={`px-6 sm:px-10 py-14 w-full ${contentWidthClass(contentWidth)} ${alignClass}`}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--block-gap, 1rem)' }}
        >
          <EyebrowElement
            text={eyebrow}
            props={props}
            elementKey="eyebrow"
          />
          <HeadingElement
            text={title}
            props={props}
            elementKey="title"
            defaultTag="h1"
            defaultSize="h1"
          />
          <HeadingElement
            text={subtitle}
            props={props}
            elementKey="subtitle"
            defaultTag="h5"
            defaultSize="h4"
          />
          <CtaPair props={props} />
        </div>
      </div>
    </section>
  );
}
