import { useRelatedSermons } from '@dw-church/api-client';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { RelatedPosts } from '../common/RelatedPosts';
import { SermonCard } from './SermonCard';

export interface RelatedSermonsProps {
  sermonId: string;
  limit?: number;
  className?: string;
}

export function RelatedSermons({ sermonId, limit = 4, className = '' }: RelatedSermonsProps) {
  const { data: sermons, isLoading } = useRelatedSermons(sermonId, { limit });

  if (isLoading) {
    return <LoadingSpinner className={className} />;
  }

  if (!sermons || sermons.length === 0) return null;

  return (
    <RelatedPosts title="관련 설교" className={className}>
      {sermons.map((sermon) => (
        <SermonCard key={sermon.id} sermon={sermon} />
      ))}
    </RelatedPosts>
  );
}
