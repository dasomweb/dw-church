import type { Event } from '@dw-church/api-client';
import { useEvents } from '@dw-church/api-client';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { EventCard } from './EventCard';

export interface EventGridProps {
  data?: Event[];
  limit?: number;
  columns?: number;
  className?: string;
  onItemClick?: (id: string) => void;
}

const GRID_COLS: Record<number, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
};

export function EventGrid({ data, limit, columns = 3, className = '', onItemClick }: EventGridProps) {
  const { data: fetchedData, isLoading } = useEvents();
  const allEvents = data ?? fetchedData?.data ?? [];
  const events = limit ? allEvents.slice(0, limit) : allEvents;

  if (!data && isLoading) return <LoadingSpinner />;
  if (events.length === 0) return <EmptyState title="행사가 없습니다" />;

  return (
    <div
      className={`grid ${GRID_COLS[columns] || GRID_COLS[3]} gap-6 ${className}`}
    >
      {events.map((event) => (
        <EventCard key={event.id} event={event} onClick={onItemClick} />
      ))}
    </div>
  );
}
