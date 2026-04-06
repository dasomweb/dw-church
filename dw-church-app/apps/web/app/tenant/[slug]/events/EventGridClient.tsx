'use client';

import { useRouter } from 'next/navigation';
import { EventGrid } from '@dw-church/ui-components';
import type { Event } from '@dw-church/api-client';

interface EventGridClientProps {
  initialData: Event[];
  total: number;
  totalPages: number;
  currentPage: number;
  slug: string;
  columns?: number;
}

export function EventGridClient({ initialData, total, totalPages, currentPage, slug, columns = 3 }: EventGridClientProps) {
  const router = useRouter();

  return (
    <div>
      <EventGrid data={initialData} onItemClick={(id) => router.push(`/events/${id}`)} columns={columns} />
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`/events?page=${p}`}
              className={`rounded-lg px-4 py-2 text-sm ${
                p === currentPage
                  ? 'bg-[var(--dw-primary)] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
      <p className="mt-4 text-center text-sm text-gray-500">총 {total}개의 행사</p>
    </div>
  );
}
