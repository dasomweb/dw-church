'use client';

import { useRouter } from 'next/navigation';
import type { Bulletin } from '@dw-church/api-client';
import { Pagination } from '@/components/Pagination';

interface BulletinListClientProps {
  initialData: Bulletin[];
  total: number;
  totalPages: number;
  currentPage: number;
  slug: string;
  columns?: number;
}

// Bulletin dates arrive as UTC-midnight ISO strings (e.g. "2026-06-28T00:00:00.000Z").
// Parse the YYYY-MM-DD prefix directly so a negative-offset timezone never shifts
// the day, and never show the raw ISO string to visitors.
function formatBulletinDate(raw?: string | null): string {
  if (!raw) return '';
  const m = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(raw);
  return `${m[1]}년 ${Number(m[2])}월 ${Number(m[3])}일`;
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
            {(b.date || b.bulletinDate) && <p className="text-xs text-gray-400 mt-1">{formatBulletinDate(b.date || b.bulletinDate)}</p>}
          </button>
        ))}
      </div>
      <Pagination currentPage={currentPage} totalPages={totalPages} hrefForPage={(p) => `/bulletins?page=${p}`} />
      <p className="mt-4 text-center text-sm text-gray-500">총 {total}개의 주보</p>
    </div>
  );
}
