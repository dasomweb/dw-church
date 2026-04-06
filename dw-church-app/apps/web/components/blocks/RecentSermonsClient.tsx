'use client';

import { useRouter } from 'next/navigation';
import type { Sermon } from '@dw-church/api-client';
import Link from 'next/link';
import Image from 'next/image';

interface RecentSermonsClientProps {
  sermons: Sermon[];
  slug: string;
  columns?: number;
}

const GRID_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
};

export function RecentSermonsClient({ sermons, slug, columns = 3 }: RecentSermonsClientProps) {
  const router = useRouter();
  const gridClass = GRID_COLS[columns] || GRID_COLS[3];
  const isList = columns === 1;

  return (
    <div>
      <div className={`grid ${gridClass} gap-6`}>
        {sermons.map((sermon: any) => (
          <button
            key={sermon.id}
            onClick={() => router.push(`/sermons/${sermon.id}`)}
            className={`group text-left rounded-xl overflow-hidden border border-gray-200 hover:shadow-lg transition-all ${isList ? 'flex gap-4' : ''}`}
          >
            <div className={`relative overflow-hidden ${isList ? 'w-48 flex-shrink-0' : 'aspect-video'}`}>
              {sermon.thumbnailUrl ? (
                <Image src={sermon.thumbnailUrl} alt={sermon.title} fill className="object-cover group-hover:scale-105 transition-transform" sizes="(max-width: 768px) 100vw, 33vw" />
              ) : (
                <div className="w-full h-full min-h-[120px] bg-gray-100 flex items-center justify-center text-gray-400 text-2xl">🎤</div>
              )}
            </div>
            <div className="p-3 flex-1">
              <h3 className="font-semibold text-sm line-clamp-2">{sermon.title}</h3>
              {sermon.scripture && <p className="text-xs text-gray-500 mt-1">{sermon.scripture}</p>}
              {sermon.date && <p className="text-xs text-gray-400 mt-1">{sermon.date}</p>}
            </div>
          </button>
        ))}
      </div>
      <div className="mt-8 text-center">
        <Link
          href="/sermons"
          className="inline-block rounded-lg border border-[var(--dw-primary)] px-6 py-2 text-sm font-medium text-[var(--dw-primary)] hover:bg-[var(--dw-primary)] hover:text-white transition-colors"
        >
          전체 설교 보기
        </Link>
      </div>
    </div>
  );
}
