'use client';

import { useRouter } from 'next/navigation';
import type { Bulletin } from '@dw-church/api-client';
import Link from 'next/link';

interface RecentBulletinsClientProps {
  bulletins: Bulletin[];
  slug: string;
  columns?: number;
}

export function RecentBulletinsClient({ bulletins, slug, columns = 1 }: RecentBulletinsClientProps) {
  const router = useRouter();
  const isGrid = columns > 1;

  return (
    <div>
      <div className={isGrid ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
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
