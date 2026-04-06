'use client';

import { useRouter } from 'next/navigation';
import type { Album } from '@dw-church/api-client';
import Image from 'next/image';

interface AlbumGalleryClientProps {
  initialData: Album[];
  total: number;
  totalPages: number;
  currentPage: number;
  slug: string;
  columns?: number;
}

const GRID_COLS: Record<number, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
};

export function AlbumGalleryClient({ initialData, total, totalPages, currentPage, slug, columns = 3 }: AlbumGalleryClientProps) {
  const router = useRouter();
  const gridClass = GRID_COLS[columns] || GRID_COLS[3];

  return (
    <div>
      <div className={`grid ${gridClass} gap-4`}>
        {initialData.map((album: any) => (
          <button
            key={album.id}
            onClick={() => router.push(`/albums/${album.id}`)}
            className="group text-left rounded-xl overflow-hidden border border-gray-200 hover:shadow-lg transition-all"
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              {album.thumbnailUrl ? (
                <Image src={album.thumbnailUrl} alt={album.title} fill className="object-cover group-hover:scale-105 transition-transform" sizes="(max-width: 768px) 100vw, 33vw" />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-2xl">📷</div>
              )}
            </div>
            <div className="p-3">
              <h3 className="font-medium text-sm truncate">{album.title}</h3>
            </div>
          </button>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`/albums?page=${p}`}
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
      <p className="mt-4 text-center text-sm text-gray-500">총 {total}개의 앨범</p>
    </div>
  );
}
