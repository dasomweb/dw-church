import { useState, useEffect, useCallback, useId } from 'react';
import type { CSSProperties } from 'react';
import type { Banner } from '@dw-church/api-client';
import { useActiveBanners } from '@dw-church/api-client';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';

export interface BannerSliderProps {
  data?: Banner[];
  category?: 'main' | 'sub';
  autoPlayInterval?: number;
  className?: string;
  /** Tint over the banner image. Default #000000. */
  overlayColor?: string;
  /** Overlay opacity 0–100 (0 = no overlay). Default 20. */
  overlayOpacity?: number;
  /** LEGACY: slide height as a % of width (paddingBottom). Used only when the
   *  explicit per-breakpoint heights below are all unset, so existing banners
   *  keep their look. Default 40. */
  heightRatio?: number;
  /** Explicit fixed heights per breakpoint (CSS length, e.g. "600px" or
   *  "100vh"). Designed against a 1920px desktop. When ANY is set the slider
   *  switches to fixed-height mode (image object-cover fills it) and applies
   *  the right one responsively: mobile <768px, tablet 768–1023px,
   *  desktop ≥1024px. Missing breakpoints fall back to sensible defaults. */
  desktopHeight?: string;
  tabletHeight?: string;
  mobileHeight?: string;
}

const DEFAULT_DESKTOP_H = '600px';
const DEFAULT_TABLET_H = '400px';
const DEFAULT_MOBILE_H = '300px';

function BannerTextOverlay({ banner }: { banner: Banner }) {
  const { textOverlay } = banner;
  if (!textOverlay?.heading && !textOverlay?.subheading && !textOverlay?.description) return null;

  const positionClasses: Record<string, string> = {
    'top-left': 'top-8 left-8',
    'top-center': 'top-8 left-1/2 -translate-x-1/2',
    'top-right': 'top-8 right-8',
    'center-left': 'top-1/2 left-8 -translate-y-1/2',
    center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
    'center-right': 'top-1/2 right-8 -translate-y-1/2',
    'bottom-left': 'bottom-8 left-8',
    'bottom-center': 'bottom-8 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-8 right-8',
  };

  const alignClasses: Record<string, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  const position = positionClasses[textOverlay.position] ?? positionClasses['center'];
  const align = alignClasses[textOverlay.align] ?? alignClasses['center'];

  return (
    <div
      className={`absolute z-10 px-4 py-2 ${position} ${align}`}
      style={{
        maxWidth: textOverlay.widths?.pc ?? '100%',
      }}
    >
      {textOverlay.subheading && (
        <p className="text-sm font-medium text-white/80 md:text-base">
          {textOverlay.subheading}
        </p>
      )}
      {textOverlay.heading && (
        <h2 className="text-2xl font-bold text-white md:text-4xl lg:text-5xl">
          {textOverlay.heading}
        </h2>
      )}
      {textOverlay.description && (
        <p className="mt-2 text-sm text-white/90 md:text-base">
          {textOverlay.description}
        </p>
      )}
      {textOverlay.buttonText && textOverlay.buttonUrl && (
        <div className="mt-4">
          <a
            href={textOverlay.buttonUrl}
            className="inline-block rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-gray-900 shadow-lg transition-colors hover:bg-gray-100"
          >
            {textOverlay.buttonText}
          </a>
        </div>
      )}
    </div>
  );
}

export function BannerSlider({
  data,
  category,
  autoPlayInterval = 5000,
  className = '',
  overlayColor = '#000000',
  overlayOpacity = 20,
  heightRatio = 40,
  desktopHeight,
  tabletHeight,
  mobileHeight,
}: BannerSliderProps) {
  const overlayAlpha = Math.min(100, Math.max(0, overlayOpacity)) / 100;
  // Fixed per-breakpoint heights take over as soon as one is provided.
  const useFixedHeight = Boolean(desktopHeight || tabletHeight || mobileHeight);
  const sliderId = useId().replace(/[:]/g, '');
  const heightVars = {
    '--bsh-mobile': mobileHeight || DEFAULT_MOBILE_H,
    '--bsh-tablet': tabletHeight || DEFAULT_TABLET_H,
    '--bsh-desktop': desktopHeight || DEFAULT_DESKTOP_H,
  } as CSSProperties;
  const { data: fetchedData, isLoading } = useActiveBanners(category);
  const banners = data ?? fetchedData?.data ?? [];

  const [currentIndex, setCurrentIndex] = useState(0);

  const goToNext = useCallback(() => {
    if (banners.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  const goToPrev = useCallback(() => {
    if (banners.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  useEffect(() => {
    if (banners.length <= 1 || autoPlayInterval <= 0) return;
    const timer = setInterval(goToNext, autoPlayInterval);
    return () => clearInterval(timer);
  }, [banners.length, autoPlayInterval, goToNext]);

  if (!data && isLoading) return <LoadingSpinner />;
  if (banners.length === 0) return <EmptyState title="배너가 없습니다" />;

  // Fixed mode: a real height per breakpoint (image object-cover fills it).
  // Legacy mode: aspect-ratio via paddingBottom (% of width).
  const slideClass = useFixedHeight ? `dw-bs-${sliderId}` : '';
  const slideStyle: CSSProperties = useFixedHeight
    ? heightVars
    : { paddingBottom: `${heightRatio}%` };

  return (
    <div className={`relative overflow-hidden ${className}`} role="region" aria-label="배너 슬라이더">
      {/* All slides are stacked; the active one fades in over the previous one
          for a smooth crossfade instead of a hard cut. */}
      <div className={`relative w-full overflow-hidden ${slideClass}`} style={slideStyle}>
        {useFixedHeight && (
          <style>{`
          .dw-bs-${sliderId}{height:var(--bsh-mobile);}
          @media (min-width:768px){.dw-bs-${sliderId}{height:var(--bsh-tablet);}}
          @media (min-width:1024px){.dw-bs-${sliderId}{height:var(--bsh-desktop);}}
        `}</style>
        )}
        {banners.map((b, idx) => {
          const active = idx === currentIndex;
          const layerClass = `absolute inset-0 transition-opacity duration-700 ease-in-out ${active ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`;
          const inner = (
            <>
              <picture>
                <source media="(max-width: 768px)" srcSet={b.mobileImageUrl ?? undefined} />
                <img
                  src={b.pcImageUrl ?? undefined}
                  alt={b.title}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </picture>
              {overlayAlpha > 0 && b.textOverlay?.overlayEnabled !== false && (
                <div className="absolute inset-0" style={{ backgroundColor: overlayColor, opacity: overlayAlpha }} />
              )}
              <BannerTextOverlay banner={b} />
            </>
          );
          return b.linkUrl ? (
            <a
              key={b.id}
              href={b.linkUrl}
              target={b.linkTarget}
              rel="noopener noreferrer"
              className={`block ${layerClass}`}
              aria-hidden={!active}
              tabIndex={active ? undefined : -1}
            >
              {inner}
            </a>
          ) : (
            <div key={b.id} className={layerClass} aria-hidden={!active}>
              {inner}
            </div>
          );
        })}
      </div>

      {/* Prev / Next Buttons */}
      {banners.length > 1 && (
        <>
          <button
            type="button"
            onClick={goToPrev}
            className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white transition-colors hover:bg-black/60"
            aria-label="이전 배너"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={goToNext}
            className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white transition-colors hover:bg-black/60"
            aria-label="다음 배너"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Dot Indicators */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          {banners.map((b, idx) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`h-2.5 w-2.5 rounded-full transition-colors ${
                idx === currentIndex ? 'bg-white' : 'bg-white/50'
              }`}
              aria-label={`배너 ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
