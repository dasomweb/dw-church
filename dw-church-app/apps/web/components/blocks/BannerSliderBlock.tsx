/**
 * Dynamic banner slider — data from admin "배너 관리" menu.
 * Banners are managed separately from the page editor.
 */
import { getBanners } from '@/lib/api';
import { HeroBannerClient } from './HeroBannerClient';

interface BannerSliderBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export async function BannerSliderBlock({ props, slug }: BannerSliderBlockProps) {
  const category = (props.category as string) ?? 'main';

  let banners;
  try {
    const result = await getBanners(slug);
    banners = Array.isArray(result) ? result : ((result as any)?.data ?? []);
    if (category) {
      banners = banners.filter((b: any) => !b.category || b.category === category);
    }
  } catch {
    banners = [];
  }

  if (banners.length === 0) {
    return (
      <section className="flex min-h-[300px] items-center justify-center bg-gradient-to-br from-[var(--dw-primary)] to-[var(--dw-secondary)] px-4 sm:min-h-[400px]">
        <div className="text-center text-white">
          <h1 className="mb-4 text-3xl font-bold font-heading sm:text-4xl">환영합니다</h1>
          <p className="text-base opacity-90 sm:text-lg">배너 관리에서 배너를 추가해주세요</p>
        </div>
      </section>
    );
  }

  return <HeroBannerClient banners={banners} />;
}
