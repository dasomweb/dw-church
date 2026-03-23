import type { Event } from '@dw-church/api-client';
import { useEvent, useRelatedEvents } from '@dw-church/api-client';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { DateBadge } from '../common/DateBadge';
import { YoutubeEmbed } from '../common/YoutubeEmbed';
import { RelatedPosts } from '../common/RelatedPosts';
import { EventCard } from './EventCard';

export interface SingleEventProps {
  data?: Event;
  postId?: string;
  className?: string;
}

export function SingleEvent({ data, postId, className = '' }: SingleEventProps) {
  const { data: fetchedEvent, isLoading } = useEvent(postId ?? '');
  const event = data ?? fetchedEvent;
  const eventId = event?.id ?? postId ?? '';
  const { data: relatedEvents } = useRelatedEvents(eventId);

  if (!data && isLoading) return <LoadingSpinner />;
  if (!event) return <EmptyState title="행사를 찾을 수 없습니다" />;

  return (
    <article className={`mx-auto max-w-4xl ${className}`}>
      {/* Hero Image */}
      {event.backgroundImageUrl && (
        <div className="relative w-full overflow-hidden rounded" style={{ paddingBottom: '50%' }}>
          <img
            src={event.backgroundImageUrl}
            alt={event.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="mt-6">
        <h1 className="text-2xl font-bold text-text-primary md:text-3xl">
          {event.title}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          {event.eventDate && <DateBadge date={event.eventDate} format="long" />}
          {event.location && (
            <span className="inline-block rounded bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              {event.location}
            </span>
          )}
          {event.department && (
            <span className="inline-block rounded bg-surface-alt px-3 py-1 text-sm text-text-secondary">
              {event.department}
            </span>
          )}
        </div>

        {event.description && (
          <div
            className="prose mt-6 max-w-none text-text-primary"
            dangerouslySetInnerHTML={{ __html: event.description }}
          />
        )}

        {event.youtubeUrl && (
          <div className="mt-8">
            <YoutubeEmbed url={event.youtubeUrl} title={event.title} />
          </div>
        )}

        {event.linkUrl && (
          <div className="mt-6">
            <a
              href={event.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded bg-primary px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              자세히 보기
            </a>
          </div>
        )}
      </div>

      {/* Related Events */}
      {relatedEvents && relatedEvents.length > 0 && (
        <RelatedPosts title="관련 행사">
          {relatedEvents.map((related) => (
            <EventCard key={related.id} event={related} />
          ))}
        </RelatedPosts>
      )}
    </article>
  );
}
