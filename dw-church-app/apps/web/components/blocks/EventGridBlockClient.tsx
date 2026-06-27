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

const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

/** Parse an event date into a {day, month} badge; null if unparseable. */
function dateBadge(raw: string | undefined): { day: string; month: string } | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return { day: String(d.getDate()), month: MONTHS[d.getMonth()] ?? '' };
}

export function EventGridBlockClient({ events, slug, columns = 3 }: EventGridBlockClientProps) {
  const router = useRouter();
  const gridClass = GRID_COLS[columns] || GRID_COLS[3];

  return (
    <div>
      <div className={`grid ${gridClass} gap-6 sm:gap-7`}>
        {events.map((event: any) => {
          const badge = dateBadge(event.eventDate);
          return (
            <button
              key={event.id}
              onClick={() => router.push(`/events/${event.id}`)}
              className="group text-left rounded-2xl overflow-hidden bg-white border border-black/[0.06] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
                {(event.backgroundImageUrl || event.thumbnailUrl) ? (
                  <Image src={event.backgroundImageUrl || event.thumbnailUrl} alt={event.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 768px) 100vw, 33vw" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/90 text-2xl sm:text-3xl" style={{ background: 'linear-gradient(135deg, var(--dw-primary, #2563eb), var(--dw-secondary, #64748b))' }}>📅</div>
                )}
                {badge && (
                  <div className="absolute top-3 left-3 rounded-xl bg-white shadow-md overflow-hidden text-center leading-none">
                    <div className="px-3 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: 'var(--dw-primary, #2563eb)' }}>{badge.month}</div>
                    <div className="px-3 py-1 text-lg font-extrabold text-gray-800">{badge.day}</div>
                  </div>
                )}
              </div>
              <div className="p-4 sm:p-5">
                <h3 className="font-bold font-heading text-[15px] leading-snug line-clamp-2 transition-colors group-hover:text-[var(--dw-primary)]">{event.title}</h3>
                {event.location && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></svg>
                    <span className="truncate">{event.location}</span>
                  </p>
                )}
                {!badge && event.eventDate && <p className="mt-1.5 text-xs text-gray-400">{event.eventDate}</p>}
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-10 text-center">
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 rounded-full px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md hover:opacity-90 transition-all"
          style={{ backgroundColor: 'var(--dw-primary, #2563eb)' }}
        >
          전체 행사 보기
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </Link>
      </div>
    </div>
  );
}
