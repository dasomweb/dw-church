'use client';

import { BulletinList } from '@dw-church/ui-components';
import type { Bulletin } from '@dw-church/api-client';
import Link from 'next/link';

interface RecentBulletinsClientProps {
  bulletins: Bulletin[];
  slug: string;
}

export function RecentBulletinsClient({ bulletins, slug }: RecentBulletinsClientProps) {
  return (
    <div>
      <BulletinList data={bulletins} />
      <div className="mt-8 text-center">
        <Link
          href={`/tenant/${slug}/bulletins`}
          className="inline-block rounded-lg border border-[var(--dw-primary)] px-6 py-2 text-sm font-medium text-[var(--dw-primary)] hover:bg-[var(--dw-primary)] hover:text-white transition-colors"
        >
          전체 주보 보기
        </Link>
      </div>
    </div>
  );
}
