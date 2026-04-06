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
    <div className="relative w-full overflow-hidden" style={{ paddingBottom: '40%' }}>
      <picture>
        <source media="(max-width: 768px)" srcSet={banner.mobileImageUrl} />
        <img
          src={banner.pcImageUrl}
          alt={banner.title}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
        />
      </picture>
      <div className="absolute inset-0 bg-black/20" />
      <BannerTextOverlay banner={banner} />
    </div>
  );

  return (
    <div className={`relative overflow-hidden ${className}`} role="region" aria-label="배너 슬라이더">
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
