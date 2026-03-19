import type { Event } from '@dw-church/api-client';
import { useEvents } from '@dw-church/api-client';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { EventCard } from './EventCard';

export interface EventGridProps {
  data?: Event[];
  limit?: number;
  className?: string;
  onItemClick?: (id: number) => void;
}

export function EventGrid({ data, limit, className = '', onItemClick }: EventGridProps) {
  const { data: fetchedData, isLoading } = useEvents();
  const allEvents = data ?? fetchedData?.data ?? [];
  const events = limit ? allEvents.slice(0, limit) : allEvents;

  if (!data && isLoading) return <LoadingSpinner />;
  if (events.length === 0) return <EmptyState title="행사가 없습니다" />;

  return (
    <div
      className={`dw-grid dw-grid-cols-1 dw-gap-4 sm:dw-grid-cols-2 lg:dw-grid-cols-3 ${className}`}
    >
      {events.map((event) => (
        <EventCard key={event.id} event={event} onClick={onItemClick} />
      ))}
    </div>
  );
}
