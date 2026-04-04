'use client';

import { ImageGallery } from '@dw-church/ui-components';

interface ImageGalleryBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export function ImageGalleryBlock({ props }: ImageGalleryBlockProps) {
  const images = (props.images as string[]) ?? [];
  const title = (props.title as string) ?? '';

  if (images.length === 0) return null;

  return (
    <section className="px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-7xl">
        {title && (
          <h2 className="mb-8 text-center text-3xl font-bold font-heading">{title}</h2>
        )}
        <ImageGallery images={images} />
      </div>
    </section>
  );
}
