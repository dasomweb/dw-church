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
    <article className={`dw-mx-auto dw-max-w-4xl ${className}`}>
      {sermon.youtubeUrl && (
        <YoutubeEmbed url={sermon.youtubeUrl} title={sermon.title} className="dw-mb-6" />
      )}

      <header className="dw-mb-8">
        <h1 className="dw-text-2xl dw-font-bold dw-text-text-primary md:dw-text-3xl">
          {sermon.title}
        </h1>
        <div className="dw-mt-3 dw-flex dw-flex-wrap dw-items-center dw-gap-3">
          <span className="dw-text-sm dw-font-medium dw-text-text-secondary">
            {sermon.preacher}
          </span>
          <DateBadge date={sermon.date} format="long" />
          {sermon.scripture && (
            <span className="dw-rounded dw-bg-primary/10 dw-px-2 dw-py-0.5 dw-text-xs dw-font-medium dw-text-primary">
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
