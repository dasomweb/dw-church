'use client';

import { useRouter } from 'next/navigation';
import type { Event } from '@dw-church/api-client';
import Link from 'next/link';
import Image from 'next/image';

interface EventGridBlockClientProps {
  events: Event[];
  slug: string;
  columns?: number;
}

const GRID_COLS: Record<number, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
};

export function EventGridBlockClient({ events, slug, columns = 3 }: EventGridBlockClientProps) {
  const router = useRouter();
  const gridClass = GRID_COLS[columns] || GRID_COLS[3];

  return (
    <div>
      <div className={`grid ${gridClass} gap-6`}>
        {events.map((event: any) => (
          <button
            key={event.id}
            onClick={() => router.push(`/events/${event.id}`)}
            className="group text-left rounded-xl overflow-hidden border border-gray-200 hover:shadow-lg transition-all"
          >
            <div className="relative aspect-video overflow-hidden">
              {(event.backgroundImageUrl || event.thumbnailUrl) ? (
                <Image src={event.backgroundImageUrl || event.thumbnailUrl} alt={event.title} fill className="object-cover group-hover:scale-105 transition-transform" sizes="(max-width: 768px) 100vw, 33vw" />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-2xl">📅</div>
              )}
            </div>
            <div className="p-3">
              <h3 className="font-semibold text-sm">{event.title}</h3>
              {event.eventDate && <p className="text-xs text-gray-500 mt-1">{event.eventDate}</p>}
              {event.location && <p className="text-xs text-gray-400 mt-0.5">{event.location}</p>}
            </div>
          </button>
        ))}
      </div>
      <div className="mt-8 text-center">
        <Link
          href="/events"
          className="inline-block rounded-lg border border-[var(--dw-primary)] px-6 py-2 text-sm font-medium text-[var(--dw-primary)] hover:bg-[var(--dw-primary)] hover:text-white transition-colors"
        >
          전체 행사 보기
        </Link>
      </div>
    </div>
  );
}
