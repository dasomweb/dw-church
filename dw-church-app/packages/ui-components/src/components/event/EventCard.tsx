import type { Event } from '@dw-church/api-client';
import { DateBadge } from '../common/DateBadge';

export interface EventCardProps {
  event: Event;
  onClick?: (id: number) => void;
  className?: string;
}

export function EventCard({ event, onClick, className = '' }: EventCardProps) {
  return (
    <article
      className={`dw-group dw-cursor-pointer dw-overflow-hidden dw-rounded dw-border dw-border-border dw-bg-surface dw-transition-shadow hover:dw-shadow-md ${className}`}
      onClick={() => onClick?.(event.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(event.id);
        }
      }}
    >
      {event.backgroundImageUrl && (
        <div className="dw-relative dw-w-full dw-overflow-hidden" style={{ paddingBottom: '56.25%' }}>
          <img
            src={event.backgroundImageUrl}
            alt={event.title}
            className="dw-absolute dw-inset-0 dw-h-full dw-w-full dw-object-cover dw-transition-transform group-hover:dw-scale-105"
            loading="lazy"
          />
          {!event.imageOnly && (
            <div className="dw-absolute dw-inset-x-0 dw-bottom-0 dw-bg-gradient-to-t dw-from-black/70 dw-to-transparent dw-px-4 dw-pb-4 dw-pt-12">
              <h3 className="dw-line-clamp-2 dw-text-lg dw-font-bold dw-text-white">
                {event.title}
              </h3>
            </div>
          )}
        </div>
      )}
      {!event.imageOnly && (
        <div className="dw-flex dw-items-center dw-gap-2 dw-p-4">
          {event.eventDate && <DateBadge date={event.eventDate} format="short" />}
          {event.location && (
            <span className="dw-inline-block dw-rounded dw-bg-primary/10 dw-px-2 dw-py-0.5 dw-text-xs dw-font-medium dw-text-primary">
              {event.location}
            </span>
          )}
        </div>
      )}
    </article>
  );
}
