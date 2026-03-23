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
      className={`group cursor-pointer overflow-hidden rounded-lg bg-white transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] ${className}`}
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
      <div className="relative w-full overflow-hidden" style={{ paddingBottom: '56.25%' }}>
        {event.backgroundImageUrl ? (
          <img
            src={event.backgroundImageUrl}
            alt={event.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <svg className="h-14 w-14 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        {/* Title overlay on image */}
        {!event.imageOnly && (
          <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-8">
            <h3 className="line-clamp-2 text-lg font-bold leading-snug text-white drop-shadow-sm">
              {event.title}
            </h3>
          </div>
        )}

        {/* Date badge top-right */}
        {event.eventDate && (
          <span className="absolute right-3 top-3 rounded bg-white/90 px-2.5 py-1 text-xs font-bold text-gray-800 backdrop-blur-sm">
            {formatDate(event.eventDate)}
          </span>
        )}
      </div>

      {/* Content below image */}
      {!event.imageOnly && (
        <div className="px-4 pb-4 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            {event.location && (
              <span className="inline-flex items-center gap-1 text-[13px] text-gray-500">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {event.location}
              </span>
            )}
            {event.department && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {event.department}
              </span>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
