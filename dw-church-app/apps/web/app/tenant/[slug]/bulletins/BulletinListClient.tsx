'use client';

import { BulletinList } from '@dw-church/ui-components';
import type { Bulletin } from '@dw-church/api-client';

interface BulletinListClientProps {
  initialData: Bulletin[];
  total: number;
  totalPages: number;
  currentPage: number;
  slug: string;
}

export function BulletinListClient({ initialData, total, totalPages, currentPage, slug }: BulletinListClientProps) {
  return (
    <div>
      <BulletinList bulletins={initialData} />
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`/tenant/${slug}/bulletins?page=${p}`}
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
