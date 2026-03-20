'use client';

import { SermonList } from '@dw-church/ui-components';
import type { Sermon } from '@dw-church/api-client';
import Link from 'next/link';

interface RecentSermonsClientProps {
  sermons: Sermon[];
  slug: string;
}

export function RecentSermonsClient({ sermons, slug }: RecentSermonsClientProps) {
  return (
    <div>
      <SermonList sermons={sermons} />
      <div className="mt-8 text-center">
        <Link
          href={`/tenant/${slug}/sermons`}
          className="inline-block rounded-lg border border-[var(--dw-primary)] px-6 py-2 text-sm font-medium text-[var(--dw-primary)] hover:bg-[var(--dw-primary)] hover:text-white transition-colors"
        >
          전체 설교 보기
        </Link>
      </div>
    </div>
  );
}
