import Image from 'next/image';

interface PastorMessageBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export function PastorMessageBlock({ props }: PastorMessageBlockProps) {
  const title = (props.title as string) ?? '';
  const pastorName = (props.pastorName as string) ?? '';
  const pastorTitle = (props.pastorTitle as string) ?? '';
  const message = (props.message as string) ?? '';
  const imageUrl = (props.imageUrl as string) ?? '';
  // Editor's 사진 좌측/우측 buttons write `variant` (id: 'left'|'right').
  // Fall back to `layout` for any older saved sections.
  const pos = (props.variant as string) || (props.layout as string) || 'right';
  const imageFirst = pos === 'left';

  return (
    <section className="px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-2">
        <div className={imageFirst ? 'order-2' : 'order-1'}>
          {title && <h2 className="mb-6 text-3xl font-bold font-heading">{title}</h2>}
          {message && (
            <div
              className="prose prose-lg mb-6 whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: message }}
            />
          )}
          {(pastorName || pastorTitle) && (
            <div className="mt-6 border-t pt-4">
              {pastorTitle && <p className="text-sm text-gray-500">{pastorTitle}</p>}
              {pastorName && <p className="text-lg font-semibold">{pastorName}</p>}
            </div>
          )}
        </div>
        {imageUrl && (
          <div className={`relative aspect-[4/5] overflow-hidden rounded-xl ${imageFirst ? 'order-1' : 'order-2'}`}>
            <Image
              src={imageUrl}
              alt={pastorName || title}
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
