'use client';

import { SingleEvent } from '@dw-church/ui-components';
import type { Event } from '@dw-church/api-client';
import Link from 'next/link';

interface SingleEventClientProps {
  event: Event;
  slug: string;
}

export function SingleEventClient({ event, slug }: SingleEventClientProps) {
  return (
    <div>
      <Link
        href={`/events`}
        className="mb-6 inline-block text-sm text-[var(--dw-primary)] hover:underline"
      >
        &larr; 행사 목록
      </Link>
      <SingleEvent data={event} />
    </div>
  );
}
