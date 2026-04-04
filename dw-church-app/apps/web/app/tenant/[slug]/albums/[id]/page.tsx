import { getAlbum } from '@/lib/api';
import { SingleAlbumClient } from './SingleAlbumClient';
import { notFound } from 'next/navigation';
import { buildTenantMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';

interface AlbumDetailProps {
  params: Promise<{ slug: string; id: string }>;
}

export async function generateMetadata({ params }: AlbumDetailProps): Promise<Metadata> {
  const { slug, id } = await params;
  try {
    const album = await getAlbum(slug, id);
    return buildTenantMetadata(slug, album?.title ?? '앨범');
  } catch {
    return buildTenantMetadata(slug, '앨범');
  }
}

export default async function AlbumDetailPage({ params }: AlbumDetailProps) {
  const { slug, id } = await params;

  if (!id) {
    notFound();
  }

  let album;
  try {
    album = await getAlbum(slug, id);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <SingleAlbumClient album={album} slug={slug} />
    </div>
  );
}
