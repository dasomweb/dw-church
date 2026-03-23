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
      className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`}
    >
      {banners.map((banner) => (
        <a
          key={banner.id}
          href={banner.linkUrl || undefined}
          target={banner.linkUrl ? banner.linkTarget : undefined}
          rel={banner.linkUrl ? 'noopener noreferrer' : undefined}
          className="group relative overflow-hidden rounded border border-border transition-shadow hover:shadow-md"
        >
          <div className="relative w-full overflow-hidden" style={{ paddingBottom: '56.25%' }}>
            <img
              src={banner.pcImageUrl}
              alt={banner.title}
              className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-4 pt-12">
              <h3 className="line-clamp-2 text-base font-semibold text-white">
                {banner.title}
              </h3>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
