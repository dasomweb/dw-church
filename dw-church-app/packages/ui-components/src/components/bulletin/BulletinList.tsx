import type { Bulletin } from '@dw-church/api-client';
import { useBulletins } from '@dw-church/api-client';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { BulletinCard } from './BulletinCard';

export interface BulletinListProps {
  data?: Bulletin[];
  limit?: number;
  page?: number;
  className?: string;
  onItemClick?: (id: string) => void;
}

export function BulletinList({
  data,
  limit = 12,
  page = 1,
  className = '',
  onItemClick,
}: BulletinListProps) {
  const { data: fetched, isLoading } = useBulletins(
    data ? undefined : { page, perPage: limit },
  );

  const bulletins = data ?? fetched?.data ?? [];

  if (!data && isLoading) {
    return <LoadingSpinner size="lg" />;
  }

  if (!bulletins.length) {
    return (
      <EmptyState
        title="주보가 없습니다"
        description="등록된 주보가 아직 없습니다."
      />
    );
  }

  return (
    <div className={`overflow-hidden rounded-lg border border-gray-200 bg-white ${className}`}>
      {bulletins.map((bulletin) => (
        <BulletinCard
          key={bulletin.id}
          bulletin={bulletin}
          onClick={onItemClick}
        />
      ))}
    </div>
  );
}
