'use client';

import { SingleSermon, YoutubeEmbed, DateBadge } from '@dw-church/ui-components';
import type { Sermon } from '@dw-church/api-client';
import Link from 'next/link';

interface SingleSermonClientProps {
  sermon: Sermon;
  slug: string;
}

export function SingleSermonClient({ sermon, slug }: SingleSermonClientProps) {
  return (
    <div>
      <Link
        href={`/sermons`}
        className="mb-6 inline-block text-sm text-[var(--dw-primary)] hover:underline"
      >
        &larr; 설교 목록
      </Link>
      <h1 className="mb-4 text-3xl font-bold font-heading">{sermon.title}</h1>
      <div className="mb-6 flex flex-wrap items-center gap-4 text-sm text-gray-500">
        <DateBadge date={sermon.date} />
        {sermon.preacher && <span>{sermon.preacher}</span>}
        {sermon.scripture && <span>{sermon.scripture}</span>}
        {sermon.category && (
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs">{sermon.category}</span>
        )}
      </div>
      {sermon.youtubeUrl && (
        <div className="mb-8">
          <YoutubeEmbed url={sermon.youtubeUrl} />
        </div>
      )}
    </div>
  );
}
