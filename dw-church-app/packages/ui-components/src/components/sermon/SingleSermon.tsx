import type { Sermon } from '@dw-church/api-client';
import { useSermon, useRelatedSermons } from '@dw-church/api-client';
import { YoutubeEmbed } from '../common/YoutubeEmbed';
import { DateBadge } from '../common/DateBadge';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { RelatedPosts } from '../common/RelatedPosts';
import { SermonCard } from './SermonCard';

export interface SingleSermonProps {
  data?: Sermon;
  postId?: string;
  className?: string;
}

export function SingleSermon({ data, postId, className = '' }: SingleSermonProps) {
  const { data: fetchedSermon, isLoading } = useSermon(data ? '' : (postId ?? ''));
  const sermon = data ?? fetchedSermon;

  const { data: relatedSermons } = useRelatedSermons(sermon?.id ?? '', { limit: 4 });

  if (!sermon && isLoading) {
    return <LoadingSpinner className={className} />;
  }

  if (!sermon) return null;

  return (
    <article className={`mx-auto max-w-4xl ${className}`}>
      {sermon.youtubeUrl && (
        <YoutubeEmbed url={sermon.youtubeUrl} title={sermon.title} className="mb-6" />
      )}

      <header className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary md:text-3xl">
          {sermon.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-text-secondary">
            {sermon.preacher}
          </span>
          <DateBadge date={sermon.date} format="long" />
          {sermon.scripture && (
            <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {sermon.scripture}
            </span>
          )}
        </div>
      </header>

      {relatedSermons && relatedSermons.length > 0 && (
        <RelatedPosts title="관련 설교">
          {relatedSermons.map((related) => (
            <SermonCard key={related.id} sermon={related} />
          ))}
        </RelatedPosts>
      )}
    </article>
  );
}
