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
  preacher?: number;
  limit?: number;
  showFilter?: boolean;
  className?: string;
  onItemClick?: (id: number) => void;
}

export function SermonList({
  data,
  category: initialCategory,
  preacher: initialPreacher,
  limit,
  showFilter = false,
  className = '',
  onItemClick,
}: SermonListProps) {
  const [category, setCategory] = useState(initialCategory ?? '');
  const [preacher, setPreacher] = useState(initialPreacher ?? 0);

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
          className="dw-mb-6"
        />
      )}

      {sermons.length === 0 ? (
        <EmptyState title="설교 영상이 없습니다" />
      ) : (
        <div className="dw-grid dw-grid-cols-1 dw-gap-6 sm:dw-grid-cols-2 lg:dw-grid-cols-3">
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
