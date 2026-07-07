'use client';

import { useRouter } from 'next/navigation';
import { EventGrid } from '@dw-church/ui-components';
import type { Event } from '@dw-church/api-client';
import { Pagination } from '@/components/Pagination';

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
      <Pagination currentPage={currentPage} totalPages={totalPages} hrefForPage={(p) => `/events?page=${p}`} />
      <p className="mt-4 text-center text-sm text-gray-500">총 {total}개의 행사</p>
    </div>
  );
}
