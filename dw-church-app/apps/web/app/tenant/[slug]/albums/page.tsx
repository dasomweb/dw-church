import { getAlbums } from '@/lib/api';
import { AlbumGalleryClient } from './AlbumGalleryClient';

interface AlbumsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function AlbumsPage({ params, searchParams }: AlbumsPageProps) {
  const { slug } = await params;
  const search = await searchParams;
  const page = parseInt(search.page ?? '1', 10);

  const albums = await getAlbums(slug, { page, perPage: 12 });

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <h1 className="mb-8 text-3xl font-bold font-heading">앨범</h1>
      <AlbumGalleryClient
        initialData={albums.data}
        total={albums.total}
        totalPages={albums.totalPages}
        currentPage={page}
        slug={slug}
      />
    </div>
  );
}
