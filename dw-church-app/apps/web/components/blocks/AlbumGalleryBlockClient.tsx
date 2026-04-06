'use client';

import { useRouter } from 'next/navigation';
import type { Album } from '@dw-church/api-client';
import Link from 'next/link';
import Image from 'next/image';

interface AlbumGalleryBlockClientProps {
  albums: Album[];
  slug: string;
  columns?: number;
}

const GRID_COLS: Record<number, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
};

export function AlbumGalleryBlockClient({ albums, slug, columns = 3 }: AlbumGalleryBlockClientProps) {
  const router = useRouter();
  const gridClass = GRID_COLS[columns] || GRID_COLS[3];

  return (
    <div>
      <div className={`grid ${gridClass} gap-4`}>
        {albums.map((album: any) => (
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
      <div className="mt-8 text-center">
        <Link
          href="/albums"
          className="inline-block rounded-lg border border-[var(--dw-primary)] px-6 py-2 text-sm font-medium text-[var(--dw-primary)] hover:bg-[var(--dw-primary)] hover:text-white transition-colors"
        >
          전체 앨범 보기
        </Link>
      </div>
    </div>
  );
}
