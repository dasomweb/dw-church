'use client';

import { useRouter } from 'next/navigation';
import type { Bulletin } from '@dw-church/api-client';

interface BulletinListClientProps {
  initialData: Bulletin[];
  total: number;
  totalPages: number;
  currentPage: number;
  slug: string;
  columns?: number;
}

const GRID_COLS: Record<number, string> = {
  1: 'space-y-3',
  2: 'grid grid-cols-1 sm:grid-cols-2 gap-4',
  3: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4',
  4: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4',
  5: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4',
  6: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3',
};

export function BulletinListClient({ initialData, total, totalPages, currentPage, slug, columns = 1 }: BulletinListClientProps) {
  const router = useRouter();
  const layoutClass = GRID_COLS[columns] || GRID_COLS[1];

  return (
    <div>
      <div className={layoutClass}>
        {initialData.map((b: any) => (
          <button
            key={b.id}
            onClick={() => router.push(`/bulletins/${b.id}`)}
            className="group w-full text-left rounded-lg border border-gray-200 p-4 hover:shadow-md hover:border-[var(--dw-primary)] transition-all"
          >
            <h3 className="font-semibold text-sm">{b.title}</h3>
            {(b.date || b.bulletinDate) && <p className="text-xs text-gray-400 mt-1">{b.date || b.bulletinDate}</p>}
          </button>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`/bulletins?page=${p}`}
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
      <p className="mt-4 text-center text-sm text-gray-500">총 {total}개의 주보</p>
    </div>
  );
}
