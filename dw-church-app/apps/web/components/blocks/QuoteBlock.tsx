interface QuoteBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export function QuoteBlock({ props }: QuoteBlockProps) {
  const quote = (props.quote as string) ?? '';
  const source = (props.source as string) ?? '';
  const reference = (props.reference as string) ?? '';
  const backgroundImageUrl = (props.backgroundImageUrl as string) ?? '';

  if (!quote) return null;

  const sectionStyle: React.CSSProperties = backgroundImageUrl
    ? {
        backgroundImage: `linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,.55)), url('${backgroundImageUrl}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {};

  const colorClass = backgroundImageUrl ? 'text-white' : 'text-gray-900';

  return (
    <section
      className={`px-4 py-16 sm:px-6 sm:py-24 ${colorClass}`}
      style={sectionStyle}
    >
      <div className="mx-auto max-w-3xl text-center">
        <svg className="mx-auto mb-4 h-10 w-10 opacity-60" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" />
        </svg>
        <p
          className="text-2xl font-medium leading-relaxed sm:text-3xl"
          dangerouslySetInnerHTML={{ __html: quote }}
        />
        {(source || reference) && (
          <footer className="mt-6 text-sm opacity-80">
            {source && <span className="font-semibold">{source}</span>}
            {source && reference && <span className="mx-2">·</span>}
            {reference && <span>{reference}</span>}
          </footer>
        )}
      </div>
    </section>
  );
}
