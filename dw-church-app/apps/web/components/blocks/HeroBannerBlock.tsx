/**
 * Static hero banner — content from page editor props only.
 * For dynamic banner slider managed via admin "배너 관리", use BannerSliderBlock.
 */
interface HeroBannerBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

const HEIGHT_MAP: Record<string, string> = {
  sm: 'min-h-[200px] sm:min-h-[250px]',
  md: 'min-h-[300px] sm:min-h-[400px]',
  lg: 'min-h-[400px] sm:min-h-[500px]',
  full: 'min-h-screen',
};

const ALIGN_MAP: Record<string, string> = {
  left: 'text-left items-start',
  center: 'text-center items-center',
  right: 'text-right items-end',
};

export function HeroBannerBlock({ props }: HeroBannerBlockProps) {
  const title = (props.title as string) || '환영합니다';
  const subtitle = (props.subtitle as string) || '사랑과 은혜가 넘치는 교회';
  const bgImage = (props.backgroundImageUrl as string) || undefined;
  const height = (props.height as string) || 'md';
  const textAlign = (props.textAlign as string) || 'center';
  // Support both naming conventions from PageEditor
  const buttonText = (props.buttonText as string) || (props.ctaLabel as string) || undefined;
  const buttonUrl = (props.buttonUrl as string) || (props.ctaUrl as string) || undefined;

  const heightClass = HEIGHT_MAP[height] || HEIGHT_MAP.md;
  const alignClass = ALIGN_MAP[textAlign] || ALIGN_MAP.center;

  return (
    <section
      className={`relative flex ${heightClass} justify-center px-4 ${alignClass}`}
      style={bgImage ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
    >
      {bgImage ? (
        <div className="absolute inset-0 bg-black/50" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--dw-primary)] to-[var(--dw-secondary)]" />
      )}
      <div className={`relative text-white flex flex-col justify-center ${textAlign === 'center' ? 'mx-auto max-w-3xl' : 'max-w-7xl w-full'}`}>
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
