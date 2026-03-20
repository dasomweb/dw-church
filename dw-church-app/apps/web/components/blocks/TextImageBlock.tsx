interface TextImageBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export function TextImageBlock({ props }: TextImageBlockProps) {
  const title = (props.title as string) ?? '';
  const content = (props.content as string) ?? '';
  const imageUrl = (props.imageUrl as string) ?? '';
  const layout = (props.layout as 'left' | 'right' | 'center') ?? 'right';

  if (layout === 'center') {
    return (
      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl text-center">
          {title && <h2 className="mb-6 text-3xl font-bold font-heading">{title}</h2>}
          {imageUrl && (
            <img src={imageUrl} alt={title} className="mx-auto mb-6 max-h-96 rounded-xl object-cover" />
          )}
          {content && (
            <div className="prose prose-lg mx-auto" dangerouslySetInnerHTML={{ __html: content }} />
          )}
        </div>
      </section>
    );
  }

  const imageFirst = layout === 'left';

  return (
    <section className="px-6 py-16">
      <div className={`mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-2 ${imageFirst ? '' : ''}`}>
        <div className={imageFirst ? 'order-2' : 'order-1'}>
          {title && <h2 className="mb-6 text-3xl font-bold font-heading">{title}</h2>}
          {content && (
            <div className="prose prose-lg" dangerouslySetInnerHTML={{ __html: content }} />
          )}
        </div>
        {imageUrl && (
          <div className={imageFirst ? 'order-1' : 'order-2'}>
            <img src={imageUrl} alt={title} className="w-full rounded-xl object-cover" />
          </div>
        )}
      </div>
    </section>
  );
}
