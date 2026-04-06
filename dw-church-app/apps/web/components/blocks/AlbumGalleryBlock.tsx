import { getAlbums } from '@/lib/api';
import { AlbumGalleryBlockClient } from './AlbumGalleryBlockClient';

interface AlbumGalleryBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export async function AlbumGalleryBlock({ props, slug }: AlbumGalleryBlockProps) {
  const limit = (props.limit as number) ?? 6;
  const title = (props.title as string) || '앨범';
  const variant = (props.variant as string) || 'grid-3';
  const columns = variant === 'grid-4' ? 4 : variant === 'masonry' ? 4 : 3;

  let albums;
  try {
    const result = await getAlbums(slug, { perPage: limit });
    albums = Array.isArray(result) ? result : (result?.data ?? []);
  } catch {
    albums = [];
  }

  if (albums.length === 0) return null;

  return (
    <section className="px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-8 text-center text-3xl font-bold font-heading">{title}</h2>
        <AlbumGalleryBlockClient albums={albums} slug={slug} columns={columns} />
      </div>
    </section>
  );
}
