import { useAlbums } from '@dw-church/api-client';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { AlbumCard } from './AlbumCard';

export interface RecentGalleryProps {
  limit?: number;
  className?: string;
  onItemClick?: (id: string) => void;
}

export function RecentGallery({ limit = 6, className = '', onItemClick }: RecentGalleryProps) {
  const { data: response, isLoading } = useAlbums({
    perPage: limit,
    orderBy: 'createdAt',
    order: 'desc',
  });

  const albums = response?.data ?? [];

  if (isLoading) return <LoadingSpinner />;
  if (!albums.length) return <EmptyState title="앨범이 없습니다" />;

  return (
    <div
      className={`grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 ${className}`}
    >
      {albums.slice(0, limit).map((album) => (
        <AlbumCard key={album.id} album={album} onClick={onItemClick} />
      ))}
    </div>
  );
}
