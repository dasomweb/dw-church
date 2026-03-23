'use client';

import { EventGrid } from '@dw-church/ui-components';
import type { Event } from '@dw-church/api-client';
import Link from 'next/link';

interface EventGridBlockClientProps {
  events: Event[];
  slug: string;
}

export function EventGridBlockClient({ events, slug }: EventGridBlockClientProps) {
  return (
    <div>
      <EventGrid data={events} />
      <div className="mt-8 text-center">
        <Link
          href={`/tenant/${slug}/events`}
          className="inline-block rounded-lg border border-[var(--dw-primary)] px-6 py-2 text-sm font-medium text-[var(--dw-primary)] hover:bg-[var(--dw-primary)] hover:text-white transition-colors"
        >
          전체 행사 보기
        </Link>
      </div>
    </div>
  );
}
