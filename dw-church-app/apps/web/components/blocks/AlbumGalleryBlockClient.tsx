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
      <div className={`grid ${gridClass} gap-4 sm:gap-5`}>
        {albums.map((album: any) => {
          const count = album.imageCount ?? album.photoCount ?? (Array.isArray(album.images) ? album.images.length : 0);
          return (
            <button
              key={album.id}
              onClick={() => router.push(`/albums/${album.id}`)}
              className="group relative text-left rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 aspect-[4/3] bg-gray-100"
            >
              {album.thumbnailUrl ? (
                <Image src={album.thumbnailUrl} alt={album.title} fill className="object-cover group-hover:scale-110 transition-transform duration-500" sizes="(max-width: 768px) 50vw, 25vw" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/90 text-3xl" style={{ background: 'linear-gradient(135deg, var(--dw-primary, #2563eb), var(--dw-secondary, #64748b))' }}>📷</div>
              )}
              {/* bottom gradient + title overlay */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-3 pt-8">
                <h3 className="text-white font-semibold text-sm leading-snug line-clamp-2 drop-shadow-sm">{album.title}</h3>
              </div>
              {count > 0 && (
                <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-black/45 backdrop-blur-sm text-white text-[11px] font-medium px-2 py-0.5">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.6-3.6a2 2 0 0 0-2.8 0L6 21" /></svg>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-10 text-center">
        <Link
          href="/albums"
          className="inline-flex items-center gap-1.5 rounded-full px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md hover:opacity-90 transition-all"
          style={{ backgroundColor: 'var(--dw-primary, #2563eb)' }}
        >
          전체 앨범 보기
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </Link>
      </div>
    </div>
  );
}
