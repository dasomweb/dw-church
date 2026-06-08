/**
 * Hero banner — renders the 4 Layout variants the inspector exposes
 * (props.variant): image-overlay / split-image / page-hero (compact) /
 * text-only. Reads flat Style-tab props (backgroundImageUrl, overlayColor,
 * overlayOpacity, height, imageUrl, textAlign, eyebrow, description). This is a
 * SELF_DESIGNED block (BlockRenderer skips the section-design wrapper for it).
 */
import { getElementStyle } from '@/lib/element-style';

interface HeroBannerBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

const HEIGHT_MAP: Record<string, string> = {
  xs: 'min-h-[160px]', sm: 'min-h-[220px]', 'sm-plus': 'min-h-[300px]',
  md: 'min-h-[360px] sm:min-h-[440px]', 'md-plus': 'min-h-[460px]',
  lg: 'min-h-[480px] sm:min-h-[560px]', 'lg-plus': 'min-h-[600px]',
  xl: 'min-h-[640px] sm:min-h-[720px]', full: 'min-h-screen',
};
const ALIGN_MAP: Record<string, string> = { left: 'text-left', center: 'text-center', right: 'text-right' };

function hexToRgba(hex: string, alpha: number): string {
  const h = (hex || '#000000').replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) || 0;
  const g = parseInt(h.substring(2, 4), 16) || 0;
  const b = parseInt(h.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function HeroBannerBlock({ props }: HeroBannerBlockProps) {
  const variant = (props.variant as string) || (props.layout as string) || 'image-overlay';
  const eyebrow = (props.eyebrow as string) || '';
  const title = (props.title as string) ?? '';
  const subtitle = (props.subtitle as string) ?? '';
  const description = (props.description as string) || '';
  const bgImage = (props.backgroundImageUrl as string) || '';
  const contentImage = (props.imageUrl as string) || '';
  const height = (props.height as string) || 'md';
  const textAlign = (props.textAlign as string) || 'center';
  const overlayColor = (props.overlayColor as string) || '#000000';
  const overlayOpacity = typeof props.overlayOpacity === 'number' ? props.overlayOpacity : 50;
  const buttonText = (props.buttonText as string) || (props.ctaLabel as string) || '';
  const buttonUrl = (props.buttonUrl as string) || (props.ctaUrl as string) || '';

  const alignClass = ALIGN_MAP[textAlign] || ALIGN_MAP.center;
  const button = buttonText && buttonUrl ? (
    <div className="mt-6">
      <a href={buttonUrl} className="inline-block rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-gray-900 shadow-lg transition-colors hover:bg-gray-100">{buttonText}</a>
    </div>
  ) : null;

  const Eyebrow = eyebrow ? <p className="mb-2 text-sm font-semibold uppercase tracking-wider opacity-80">{eyebrow}</p> : null;
  const Title = <h1 className="mb-4 text-3xl font-bold font-heading sm:text-4xl" style={getElementStyle(props, 'title')}>{title}</h1>;
  const Subtitle = subtitle ? <p className="text-base opacity-90 sm:text-lg" style={getElementStyle(props, 'subtitle')}>{subtitle}</p> : null;

  // ─── Split (Image + Text) ──────────────────────────────────────────
  if (variant === 'split-image' || variant === 'hero_split') {
    return (
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 md:grid-cols-2">
        <div className={alignClass}>
          {Eyebrow}{Title}{Subtitle}
          {description && <p className="mt-3 text-sm text-gray-600" style={getElementStyle(props, 'description')}>{description}</p>}
          {button}
        </div>
        {contentImage && (
          <div className="overflow-hidden rounded-2xl">
            <img src={contentImage} alt={title} className="h-full w-full object-cover" />
          </div>
        )}
      </section>
    );
  }

  // ─── Text Only ─────────────────────────────────────────────────────
  if (variant === 'text-only') {
    return (
      <section className={`flex ${HEIGHT_MAP.sm} items-center justify-center bg-gradient-to-br from-[var(--dw-primary)] to-[var(--dw-secondary)] px-6 py-14 text-white`}>
        <div className={`mx-auto max-w-3xl ${alignClass}`}>{Eyebrow}{Title}{Subtitle}{button}</div>
      </section>
    );
  }

  // ─── Compact (sub-page header) ─────────────────────────────────────
  const isCompact = variant === 'page-hero' || variant === 'compact';
  const heightClass = isCompact ? HEIGHT_MAP.sm : (HEIGHT_MAP[height] || HEIGHT_MAP.md);

  // ─── Image + Overlay (default) ─────────────────────────────────────
  return (
    <section
      className={`relative flex ${heightClass} items-center justify-center overflow-hidden`}
      style={bgImage ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
    >
      {bgImage ? (
        <div className="absolute inset-0" style={{ backgroundColor: hexToRgba(overlayColor, Math.min(100, Math.max(0, overlayOpacity)) / 100) }} />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--dw-primary)] to-[var(--dw-secondary)]" />
      )}
      <div className={`relative z-10 px-6 text-white ${alignClass} ${textAlign === 'center' ? 'mx-auto max-w-3xl' : 'w-full max-w-7xl'}`}>
        {Eyebrow}{Title}{Subtitle}{button}
      </div>
    </section>
  );
}
