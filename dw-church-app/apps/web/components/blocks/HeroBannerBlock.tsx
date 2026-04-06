/**
 * Static hero banner — content from page editor props only.
 * For dynamic banner slider managed via admin "배너 관리", use BannerSliderBlock.
 */
interface HeroBannerBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export function HeroBannerBlock({ props }: HeroBannerBlockProps) {
  const title = (props.title as string) || '환영합니다';
  const subtitle = (props.subtitle as string) || '사랑과 은혜가 넘치는 교회';
  const bgImage = props.backgroundImageUrl as string | undefined;
  const buttonText = props.buttonText as string | undefined;
  const buttonUrl = props.buttonUrl as string | undefined;

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
        {buttonText && buttonUrl && (
          <div className="mt-6">
            <a href={buttonUrl} className="inline-block rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-gray-900 shadow-lg hover:bg-gray-100 transition-colors">
              {buttonText}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
