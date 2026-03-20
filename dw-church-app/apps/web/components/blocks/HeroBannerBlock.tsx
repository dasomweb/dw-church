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
    banners = result.data;
  } catch {
    banners = [];
  }

  if (banners.length === 0) {
    return (
      <section className="flex min-h-[400px] items-center justify-center bg-gradient-to-br from-[var(--dw-primary)] to-[var(--dw-secondary)]">
        <div className="text-center text-white">
          <h1 className="mb-4 text-4xl font-bold font-heading">환영합니다</h1>
          <p className="text-lg opacity-90">사랑과 은혜가 넘치는 교회</p>
        </div>
      </section>
    );
  }

  return <HeroBannerClient banners={banners} />;
}
