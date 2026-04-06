import { getBanners } from '@/lib/api';
import { HeroBannerClient } from './HeroBannerClient';

interface HeroBannerBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export async function HeroBannerBlock({ props, slug }: HeroBannerBlockProps) {
  const title = (props.title as string) || '환영합니다';
  const subtitle = (props.subtitle as string) || '사랑과 은혜가 넘치는 교회';
  const bgImage = props.backgroundImageUrl as string | undefined;

  // Try to load banners from DB
  let banners;
  try {
    const result = await getBanners(slug);
    banners = Array.isArray(result) ? result : ((result as any)?.data ?? []);
  } catch {
    banners = [];
  }

  // If banners exist, use the slider
  if (banners.length > 0) {
    return <HeroBannerClient banners={banners} />;
  }

  // Otherwise show hero with props
  return (
    <section
      className="relative flex min-h-[300px] items-center justify-center px-4 sm:min-h-[400px]"
      style={bgImage ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
    >
      {bgImage ? (
        <div className="absolute inset-0 bg-black/50" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--dw-primary)] to-[var(--dw-secondary)]" />
      )}
      <div className="relative text-center text-white">
        <h1 className="mb-4 text-3xl font-bold font-heading sm:text-4xl">{title}</h1>
        <p className="text-base opacity-90 sm:text-lg">{subtitle}</p>
      </div>
    </section>
  );
}
