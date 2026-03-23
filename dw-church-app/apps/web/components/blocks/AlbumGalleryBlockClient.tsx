'use client';

import { useRouter } from 'next/navigation';
import { GalleryGrid } from '@dw-church/ui-components';
import type { Album } from '@dw-church/api-client';
import Link from 'next/link';

interface AlbumGalleryBlockClientProps {
  albums: Album[];
  slug: string;
}

export function AlbumGalleryBlockClient({ albums, slug }: AlbumGalleryBlockClientProps) {
  const router = useRouter();
  return (
    <div>
      <GalleryGrid data={albums} onItemClick={(id) => router.push(`/albums/${id}`)} />
      <div className="mt-8 text-center">
        <Link
          href={`/albums`}
          className="inline-block rounded-lg border border-[var(--dw-primary)] px-6 py-2 text-sm font-medium text-[var(--dw-primary)] hover:bg-[var(--dw-primary)] hover:text-white transition-colors"
        >
          전체 앨범 보기
        </Link>
      </div>
    </div>
  );
}
