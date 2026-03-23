'use client';

import { HistoryTimeline } from '@dw-church/ui-components';
import type { History } from '@dw-church/api-client';
import Link from 'next/link';

interface HistoryTimelineBlockClientProps {
  history: History[];
  slug: string;
}

export function HistoryTimelineBlockClient({ history, slug }: HistoryTimelineBlockClientProps) {
  return (
    <div>
      <HistoryTimeline data={history} />
      <div className="mt-8 text-center">
        <Link
          href={`/history`}
          className="inline-block rounded-lg border border-[var(--dw-primary)] px-6 py-2 text-sm font-medium text-[var(--dw-primary)] hover:bg-[var(--dw-primary)] hover:text-white transition-colors"
        >
          전체 연혁 보기
        </Link>
      </div>
    </div>
  );
}
