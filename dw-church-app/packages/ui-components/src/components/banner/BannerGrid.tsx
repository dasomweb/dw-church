import type { Banner } from '@dw-church/api-client';
import { useActiveBanners } from '@dw-church/api-client';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';

export interface BannerGridProps {
  data?: Banner[];
  category?: string;
  limit?: number;
  className?: string;
}

export function BannerGrid({ data, category, limit, className = '' }: BannerGridProps) {
  const { data: fetchedData, isLoading } = useActiveBanners(
    category as 'main' | 'sub' | undefined,
  );
  const allBanners = data ?? fetchedData?.data ?? [];
  const banners = limit ? allBanners.slice(0, limit) : allBanners;

  if (!data && isLoading) return <LoadingSpinner />;
  if (banners.length === 0) return <EmptyState title="배너가 없습니다" />;

  return (
    <div
      className={`dw-grid dw-grid-cols-1 dw-gap-4 sm:dw-grid-cols-2 lg:dw-grid-cols-3 ${className}`}
    >
      {banners.map((banner) => (
        <a
          key={banner.id}
          href={banner.linkUrl || undefined}
          target={banner.linkUrl ? banner.linkTarget : undefined}
          rel={banner.linkUrl ? 'noopener noreferrer' : undefined}
          className="dw-group dw-relative dw-overflow-hidden dw-rounded dw-border dw-border-border dw-transition-shadow hover:dw-shadow-md"
        >
          <div className="dw-relative dw-w-full dw-overflow-hidden" style={{ paddingBottom: '56.25%' }}>
            <img
              src={banner.pcImageUrl}
              alt={banner.title}
              className="dw-absolute dw-inset-0 dw-h-full dw-w-full dw-object-cover dw-transition-transform group-hover:dw-scale-105"
              loading="lazy"
            />
            <div className="dw-absolute dw-inset-x-0 dw-bottom-0 dw-bg-gradient-to-t dw-from-black/70 dw-to-transparent dw-px-4 dw-pb-4 dw-pt-12">
              <h3 className="dw-line-clamp-2 dw-text-base dw-font-semibold dw-text-white">
                {banner.title}
              </h3>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
