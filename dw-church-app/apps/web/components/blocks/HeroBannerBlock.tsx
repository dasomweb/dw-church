/**
 * Hero banner — CONTENT only. Section design (background image/color, overlay,
 * height, width, border, padding) is applied by BlockRenderer's wrapper from
 * the flat Style-tab props (resolveSectionDesign), so this component renders
 * just the headline / subtitle / button. A gradient fallback fills the section
 * when the operator hasn't set any background.
 */
import { getElementStyle } from '@/lib/element-style';

interface HeroBannerBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

const ALIGN_MAP: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export function HeroBannerBlock({ props }: HeroBannerBlockProps) {
  const title = (props.title as string) || '환영합니다';
  const subtitle = (props.subtitle as string) || '사랑과 은혜가 넘치는 교회';
  const textAlign = (props.textAlign as string) || 'center';
  const buttonText = (props.buttonText as string) || (props.ctaLabel as string) || undefined;
  const buttonUrl = (props.buttonUrl as string) || (props.ctaUrl as string) || undefined;

  const alignClass = ALIGN_MAP[textAlign] || ALIGN_MAP.center;
  // Fallback gradient only when no background was configured on the section.
  const hasBg = Boolean(props.backgroundImageUrl || props.backgroundColor);

  return (
    <section
      className={`relative flex min-h-[300px] items-center justify-center px-6 py-16 ${
        !hasBg ? 'bg-gradient-to-br from-[var(--dw-primary)] to-[var(--dw-secondary)]' : ''
      }`}
    >
      <div className={`${alignClass} text-white ${textAlign === 'center' ? 'mx-auto max-w-3xl' : 'w-full max-w-7xl'}`}>
        <h1 className="mb-4 text-3xl font-bold font-heading sm:text-4xl" style={getElementStyle(props, 'title')}>{title}</h1>
        <p className="text-base opacity-90 sm:text-lg" style={getElementStyle(props, 'subtitle')}>{subtitle}</p>
        {buttonText && buttonUrl && (
          <div className="mt-6">
            <a href={buttonUrl} className="inline-block rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-gray-900 shadow-lg transition-colors hover:bg-gray-100">
              {buttonText}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
