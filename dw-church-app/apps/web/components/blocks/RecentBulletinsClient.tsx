'use client';

import { useRouter } from 'next/navigation';
import type { Bulletin } from '@dw-church/api-client';
import Link from 'next/link';

interface RecentBulletinsClientProps {
  bulletins: Bulletin[];
  slug: string;
  columns?: number;
}

const GRID_COLS: Record<number, string> = {
  1: '',
  2: 'grid grid-cols-1 sm:grid-cols-2 gap-4',
  3: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4',
  4: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4',
  5: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4',
  6: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3',
};

export function RecentBulletinsClient({ bulletins, slug, columns = 1 }: RecentBulletinsClientProps) {
  const router = useRouter();
  const isGrid = columns > 1;
  const gridClass = GRID_COLS[columns] || GRID_COLS[3];

  return (
    <div>
      <div className={isGrid ? gridClass : 'space-y-3'}>
        {bulletins.map((b: any) => (
          <button
            key={b.id}
            onClick={() => router.push(`/bulletins/${b.id}`)}
            className="group w-full text-left rounded-lg border border-gray-200 p-4 hover:shadow-md hover:border-[var(--dw-primary)] transition-all"
          >
            <h3 className="font-semibold text-sm">{b.title}</h3>
            {b.date && <p className="text-xs text-gray-400 mt-1">{b.date}</p>}
          </button>
        ))}
      </div>
      <div className="mt-8 text-center">
        <Link
          href="/bulletins"
          className="inline-block rounded-lg border border-[var(--dw-primary)] px-6 py-2 text-sm font-medium text-[var(--dw-primary)] hover:bg-[var(--dw-primary)] hover:text-white transition-colors"
        >
          전체 주보 보기
        </Link>
      </div>
    </div>
  );
}
