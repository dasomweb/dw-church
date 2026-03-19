import { useState, useEffect, useCallback } from 'react';
import type { Banner } from '@dw-church/api-client';
import { useActiveBanners } from '@dw-church/api-client';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';

export interface BannerSliderProps {
  data?: Banner[];
  category?: 'main' | 'sub';
  autoPlayInterval?: number;
  className?: string;
}

function BannerTextOverlay({ banner }: { banner: Banner }) {
  const { textOverlay } = banner;
  if (!textOverlay?.heading && !textOverlay?.subheading && !textOverlay?.description) return null;

  const positionClasses: Record<string, string> = {
    'top-left': 'dw-top-8 dw-left-8',
    'top-center': 'dw-top-8 dw-left-1/2 -dw-translate-x-1/2',
    'top-right': 'dw-top-8 dw-right-8',
    'center-left': 'dw-top-1/2 dw-left-8 -dw-translate-y-1/2',
    center: 'dw-top-1/2 dw-left-1/2 -dw-translate-x-1/2 -dw-translate-y-1/2',
    'center-right': 'dw-top-1/2 dw-right-8 -dw-translate-y-1/2',
    'bottom-left': 'dw-bottom-8 dw-left-8',
    'bottom-center': 'dw-bottom-8 dw-left-1/2 -dw-translate-x-1/2',
    'bottom-right': 'dw-bottom-8 dw-right-8',
  };

  const alignClasses: Record<string, string> = {
    left: 'dw-text-left',
    center: 'dw-text-center',
    right: 'dw-text-right',
  };

  const position = positionClasses[textOverlay.position] ?? positionClasses['center'];
  const align = alignClasses[textOverlay.align] ?? alignClasses['center'];

  return (
    <div
      className={`dw-absolute dw-z-10 dw-px-4 dw-py-2 ${position} ${align}`}
      style={{
        maxWidth: textOverlay.widths?.pc ?? '100%',
      }}
    >
      {textOverlay.subheading && (
        <p className="dw-text-sm dw-font-medium dw-text-white/80 md:dw-text-base">
          {textOverlay.subheading}
        </p>
      )}
      {textOverlay.heading && (
        <h2 className="dw-text-2xl dw-font-bold dw-text-white md:dw-text-4xl lg:dw-text-5xl">
          {textOverlay.heading}
        </h2>
      )}
      {textOverlay.description && (
        <p className="dw-mt-2 dw-text-sm dw-text-white/90 md:dw-text-base">
          {textOverlay.description}
        </p>
      )}
    </div>
  );
}

export function BannerSlider({
  data,
  category,
  autoPlayInterval = 5000,
  className = '',
}: BannerSliderProps) {
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

  const banner = banners[currentIndex]!;

  const slideContent = (
    <div className="dw-relative dw-w-full dw-overflow-hidden" style={{ paddingBottom: '40%' }}>
      <picture>
        <source media="(max-width: 768px)" srcSet={banner.mobileImageUrl} />
        <img
          src={banner.pcImageUrl}
          alt={banner.title}
          className="dw-absolute dw-inset-0 dw-h-full dw-w-full dw-object-cover dw-transition-opacity dw-duration-500"
        />
      </picture>
      <div className="dw-absolute dw-inset-0 dw-bg-black/20" />
      <BannerTextOverlay banner={banner} />
    </div>
  );

  return (
    <div className={`dw-relative dw-overflow-hidden ${className}`} role="region" aria-label="배너 슬라이더">
      {banner.linkUrl ? (
        <a href={banner.linkUrl} target={banner.linkTarget} rel="noopener noreferrer">
          {slideContent}
        </a>
      ) : (
        slideContent
      )}

      {/* Prev / Next Buttons */}
      {banners.length > 1 && (
        <>
          <button
            type="button"
            onClick={goToPrev}
            className="dw-absolute dw-left-4 dw-top-1/2 dw-z-20 -dw-translate-y-1/2 dw-rounded-full dw-bg-black/40 dw-p-2 dw-text-white dw-transition-colors hover:dw-bg-black/60"
            aria-label="이전 배너"
          >
            <svg className="dw-h-5 dw-w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={goToNext}
            className="dw-absolute dw-right-4 dw-top-1/2 dw-z-20 -dw-translate-y-1/2 dw-rounded-full dw-bg-black/40 dw-p-2 dw-text-white dw-transition-colors hover:dw-bg-black/60"
            aria-label="다음 배너"
          >
            <svg className="dw-h-5 dw-w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Dot Indicators */}
      {banners.length > 1 && (
        <div className="dw-absolute dw-bottom-4 dw-left-1/2 dw-z-20 dw-flex -dw-translate-x-1/2 dw-gap-2">
          {banners.map((b, idx) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`dw-h-2.5 dw-w-2.5 dw-rounded-full dw-transition-colors ${
                idx === currentIndex ? 'dw-bg-white' : 'dw-bg-white/50'
              }`}
              aria-label={`배너 ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
