import type { Event } from '@dw-church/api-client';

export interface EventCardProps {
  event: Event;
  onClick?: (id: string) => void;
  className?: string;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

export function EventCard({ event, onClick, className = '' }: EventCardProps) {
  return (
    <article
      className={`dw-group dw-cursor-pointer dw-overflow-hidden dw-rounded-lg dw-bg-white dw-transition-all dw-duration-300 hover:dw--translate-y-1.5 hover:dw-shadow-[0_8px_30px_rgba(0,0,0,0.12)] ${className}`}
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
      {/* Large thumbnail 16:9 */}
      <div className="dw-relative dw-w-full dw-overflow-hidden" style={{ paddingBottom: '56.25%' }}>
        {event.backgroundImageUrl ? (
          <img
            src={event.backgroundImageUrl}
            alt={event.title}
            className="dw-absolute dw-inset-0 dw-h-full dw-w-full dw-object-cover dw-transition-transform dw-duration-500 group-hover:dw-scale-105"
            loading="lazy"
          />
        ) : (
          <div className="dw-absolute dw-inset-0 dw-flex dw-items-center dw-justify-center dw-bg-gray-100">
            <svg className="dw-h-14 dw-w-14 dw-text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="dw-absolute dw-inset-0 dw-bg-gradient-to-t dw-from-black/60 dw-via-black/20 dw-to-transparent" />

        {/* Title overlay on image */}
        {!event.imageOnly && (
          <div className="dw-absolute dw-inset-x-0 dw-bottom-0 dw-px-4 dw-pb-4 dw-pt-8">
            <h3 className="dw-line-clamp-2 dw-text-lg dw-font-bold dw-leading-snug dw-text-white dw-drop-shadow-sm">
              {event.title}
            </h3>
          </div>
        )}

        {/* Date badge top-right */}
        {event.eventDate && (
          <span className="dw-absolute dw-right-3 dw-top-3 dw-rounded dw-bg-white/90 dw-px-2.5 dw-py-1 dw-text-xs dw-font-bold dw-text-gray-800 dw-backdrop-blur-sm">
            {formatDate(event.eventDate)}
          </span>
        )}
      </div>

      {/* Content below image */}
      {!event.imageOnly && (
        <div className="dw-px-4 dw-pb-4 dw-pt-3">
          <div className="dw-flex dw-flex-wrap dw-items-center dw-gap-2">
            {event.location && (
              <span className="dw-inline-flex dw-items-center dw-gap-1 dw-text-[13px] dw-text-gray-500">
                <svg className="dw-h-3.5 dw-w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {event.location}
              </span>
            )}
            {event.department && (
              <span className="dw-rounded-full dw-bg-primary/10 dw-px-2.5 dw-py-0.5 dw-text-xs dw-font-medium dw-text-primary">
                {event.department}
              </span>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
