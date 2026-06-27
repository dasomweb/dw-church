import { getAlbums } from '@/lib/api';
import { getElementStyle } from '@/lib/element-style';
import { DataSection } from './DataSection';
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
  const category = (props.category as string) || '';

  let albums;
  try {
    const result = await getAlbums(slug, { perPage: limit, category });
    albums = Array.isArray(result) ? result : (result?.data ?? []);
  } catch {
    albums = [];
  }

  if (albums.length === 0) {
    return (
      <DataSection props={props}>
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="mb-4 text-2xl sm:text-3xl font-bold font-heading" style={getElementStyle(props, 'title')}>{title}</h2>
          <p className="text-gray-400 text-sm">등록된 앨범이 없습니다.</p>
        </div>
      </DataSection>
    );
  }

  return (
    <DataSection props={props}>
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-8 text-center text-2xl sm:text-3xl font-bold font-heading" style={getElementStyle(props, 'title')}>{title}</h2>
        <AlbumGalleryBlockClient albums={albums} slug={slug} columns={columns} />
      </div>
    </DataSection>
  );
}
