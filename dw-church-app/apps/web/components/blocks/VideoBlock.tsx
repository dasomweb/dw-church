'use client';

import { YoutubeEmbed } from '@dw-church/ui-components';

interface VideoBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export function VideoBlock({ props }: VideoBlockProps) {
  const youtubeUrl = (props.youtubeUrl as string) ?? '';
  const title = (props.title as string) ?? '';

  if (!youtubeUrl) return null;

  return (
    <section className="px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-4xl">
        {title && (
          <h2 className="mb-8 text-center text-3xl font-bold font-heading">{title}</h2>
        )}
        <YoutubeEmbed url={youtubeUrl} />
      </div>
    </section>
  );
}
