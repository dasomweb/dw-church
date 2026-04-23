import Image from 'next/image';

interface TextImageBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export function TextImageBlock({ props }: TextImageBlockProps) {
  const title = (props.title as string) ?? '';
  const content = (props.content as string) ?? '';
  const imageUrl = (props.imageUrl as string) ?? '';
  // Editor variant buttons write `variant`; older data may use `layout`.
  const layout = ((props.variant as string) || (props.layout as string) || 'right') as 'left' | 'right' | 'center';

  if (layout === 'center') {
    return (
      <section className="px-4 py-10 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-4xl text-center">
          {title && <h2 className="mb-6 text-3xl font-bold font-heading">{title}</h2>}
          {imageUrl && (
            <div className="relative mx-auto mb-6 aspect-video max-w-2xl overflow-hidden rounded-xl">
              <Image
                src={imageUrl}
                alt={title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
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
    <section className="px-4 py-10 sm:px-6 sm:py-16">
      <div className={`mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-2 ${imageFirst ? '' : ''}`}>
        <div className={imageFirst ? 'order-2' : 'order-1'}>
          {title && <h2 className="mb-6 text-3xl font-bold font-heading">{title}</h2>}
          {content && (
            <div className="prose prose-lg" dangerouslySetInnerHTML={{ __html: content }} />
          )}
        </div>
        {imageUrl && (
          <div className={`relative aspect-video overflow-hidden rounded-xl ${imageFirst ? 'order-1' : 'order-2'}`}>
            <Image
              src={imageUrl}
              alt={title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        )}
      </div>
    </section>
  );
}
