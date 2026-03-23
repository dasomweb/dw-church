import { getAlbums } from '@/lib/api';
import { AlbumGalleryClient } from './AlbumGalleryClient';
import { buildTenantMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';

interface AlbumsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: AlbumsPageProps): Promise<Metadata> {
  const { slug } = await params;
  return buildTenantMetadata(slug, '앨범');
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
        initialData={albums.data ?? []}
        total={albums.meta?.total ?? 0}
        totalPages={albums.meta?.totalPages ?? 1}
        currentPage={page}
        slug={slug}
      />
    </div>
  );
}
