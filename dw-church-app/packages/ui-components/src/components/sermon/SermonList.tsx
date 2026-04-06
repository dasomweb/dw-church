import { useState } from 'react';
import type { Sermon } from '@dw-church/api-client';
import { useSermons } from '@dw-church/api-client';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { SermonCard } from './SermonCard';
import { SermonFilter } from './SermonFilter';

export interface SermonListProps {
  data?: Sermon[];
  category?: string;
  preacher?: string;
  limit?: number;
  columns?: number;
  showFilter?: boolean;
  className?: string;
  onItemClick?: (id: string) => void;
}

const GRID_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
};

export function SermonList({
  data,
  category: initialCategory,
  preacher: initialPreacher,
  limit,
  columns = 4,
  showFilter = false,
  className = '',
  onItemClick,
}: SermonListProps) {
  const [category, setCategory] = useState(initialCategory ?? '');
  const [preacher, setPreacher] = useState(initialPreacher ?? '');

  const {
    data: response,
    isLoading,
  } = useSermons(
    data
      ? undefined
      : {
          category: category || undefined,
          preacher: preacher || undefined,
          perPage: limit,
        },
  );

  const sermons = data ?? response?.data ?? [];

  if (!data && isLoading) {
    return <LoadingSpinner className={className} />;
  }

  return (
    <div className={className}>
      {showFilter && (
        <SermonFilter
          selectedCategory={category}
          selectedPreacher={preacher}
          onCategoryChange={setCategory}
          onPreacherChange={setPreacher}
          className="mb-6"
        />
      )}

      {sermons.length === 0 ? (
        <EmptyState title="설교 영상이 없습니다" />
      ) : (
        <div className={`grid ${GRID_COLS[columns] || GRID_COLS[4]} gap-6`}>
          {sermons.map((sermon) => (
            <SermonCard
              key={sermon.id}
              sermon={sermon}
              onClick={onItemClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
