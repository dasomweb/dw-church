import { getAlbums } from '@/lib/api';
import { AlbumGalleryBlockClient } from './AlbumGalleryBlockClient';

interface AlbumGalleryBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export async function AlbumGalleryBlock({ props, slug }: AlbumGalleryBlockProps) {
  const limit = (props.limit as number) ?? 6;

  let albums;
  try {
    const result = await getAlbums(slug, { perPage: limit });
    albums = Array.isArray(result) ? result : (result?.data ?? []);
  } catch {
    albums = [];
  }

  if (albums.length === 0) return null;

  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-8 text-center text-3xl font-bold font-heading">앨범</h2>
        <AlbumGalleryBlockClient albums={albums} slug={slug} />
      </div>
    </section>
  );
}
