'use client';

import { SingleAlbum } from '@dw-church/ui-components';
import type { Album } from '@dw-church/api-client';
import Link from 'next/link';

interface SingleAlbumClientProps {
  album: Album;
  slug: string;
}

export function SingleAlbumClient({ album, slug }: SingleAlbumClientProps) {
  return (
    <div>
      <Link
        href={`/albums`}
        className="mb-6 inline-block text-sm text-[var(--dw-primary)] hover:underline"
      >
        &larr; 앨범 목록
      </Link>
      <SingleAlbum data={album} />
    </div>
  );
}
