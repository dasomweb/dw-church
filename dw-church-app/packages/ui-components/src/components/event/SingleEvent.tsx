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
    <article className={`dw-mx-auto dw-max-w-4xl ${className}`}>
      {/* Hero Image */}
      {event.backgroundImageUrl && (
        <div className="dw-relative dw-w-full dw-overflow-hidden dw-rounded" style={{ paddingBottom: '50%' }}>
          <img
            src={event.backgroundImageUrl}
            alt={event.title}
            className="dw-absolute dw-inset-0 dw-h-full dw-w-full dw-object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="dw-mt-6">
        <h1 className="dw-text-2xl dw-font-bold dw-text-text-primary md:dw-text-3xl">
          {event.title}
        </h1>

        <div className="dw-mt-3 dw-flex dw-flex-wrap dw-items-center dw-gap-3">
          {event.eventDate && <DateBadge date={event.eventDate} format="long" />}
          {event.location && (
            <span className="dw-inline-block dw-rounded dw-bg-primary/10 dw-px-3 dw-py-1 dw-text-sm dw-font-medium dw-text-primary">
              {event.location}
            </span>
          )}
          {event.department && (
            <span className="dw-inline-block dw-rounded dw-bg-surface-alt dw-px-3 dw-py-1 dw-text-sm dw-text-text-secondary">
              {event.department}
            </span>
          )}
        </div>

        {event.description && (
          <div
            className="dw-prose dw-mt-6 dw-max-w-none dw-text-text-primary"
            dangerouslySetInnerHTML={{ __html: event.description }}
          />
        )}

        {event.youtubeUrl && (
          <div className="dw-mt-8">
            <YoutubeEmbed url={event.youtubeUrl} title={event.title} />
          </div>
        )}

        {event.linkUrl && (
          <div className="dw-mt-6">
            <a
              href={event.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="dw-inline-block dw-rounded dw-bg-primary dw-px-6 dw-py-2 dw-text-sm dw-font-medium dw-text-white dw-transition-colors hover:dw-bg-primary/90"
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
