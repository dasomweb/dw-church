import type { Album } from '@dw-church/api-client';
import { useAlbums } from '@dw-church/api-client';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { AlbumCard } from './AlbumCard';

export interface GalleryGridProps {
  data?: Album[];
  category?: string;
  limit?: number;
  columns?: number;
  className?: string;
  onItemClick?: (id: string) => void;
}

const GRID_COLS: Record<number, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
};

export function GalleryGrid({ data, category, limit, columns = 3, className = '', onItemClick }: GalleryGridProps) {
  const { data: response, isLoading } = useAlbums(
    data ? undefined : { perPage: limit, search: category },
  );

  const albums = data ?? response?.data ?? [];
  const items = limit ? albums.slice(0, limit) : albums;

  if (!data && isLoading) return <LoadingSpinner />;
  if (!items.length) return <EmptyState title="앨범이 없습니다" />;

  return (
    <div className={`grid ${GRID_COLS[columns] || GRID_COLS[3]} gap-6 ${className}`}>
      {items.map((album) => (
        <AlbumCard key={album.id} album={album} onClick={onItemClick} />
      ))}
    </div>
  );
}
