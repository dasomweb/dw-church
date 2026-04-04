import { getBanners } from '@/lib/api';
import { HeroBannerClient } from './HeroBannerClient';

interface HeroBannerBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export async function HeroBannerBlock({ slug }: HeroBannerBlockProps) {
  let banners;
  try {
    const result = await getBanners(slug);
    banners = Array.isArray(result) ? result : ((result as any)?.data ?? []);
  } catch {
    banners = [];
  }

  if (banners.length === 0) {
    return (
      <section className="flex min-h-[300px] items-center justify-center bg-gradient-to-br from-[var(--dw-primary)] to-[var(--dw-secondary)] px-4 sm:min-h-[400px]">
        <div className="text-center text-white">
          <h1 className="mb-4 text-3xl font-bold font-heading sm:text-4xl">환영합니다</h1>
          <p className="text-base opacity-90 sm:text-lg">사랑과 은혜가 넘치는 교회</p>
        </div>
      </section>
    );
  }

  return <HeroBannerClient banners={banners} />;
}
