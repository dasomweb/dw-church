import type { History } from '@dw-church/api-client';
import { useHistory } from '@dw-church/api-client';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { HistoryYearSection } from './HistoryYearSection';

export interface HistoryTimelineProps {
  data?: History[];
  layout?: 'vertical' | 'horizontal';
  className?: string;
}

export function HistoryTimeline({
  data,
  layout = 'vertical',
  className = '',
}: HistoryTimelineProps) {
  const { data: fetchedHistory, isLoading } = useHistory();
  const historyList = data ?? fetchedHistory ?? [];

  if (!data && isLoading) return <LoadingSpinner />;
  if (historyList.length === 0) return <EmptyState title="연혁이 없습니다" />;

  const sorted = [...historyList].sort((a, b) => b.year - a.year);

  if (layout === 'horizontal') {
    return (
      <div className={`overflow-x-auto ${className}`}>
        <div className="flex gap-8 pb-4">
          {sorted.map((entry) => (
            <div key={entry.id} className="w-80 flex-shrink-0">
              <HistoryYearSection year={entry.year} items={entry.items} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-10 ${className}`}>
      {sorted.map((entry) => (
        <HistoryYearSection key={entry.id} year={entry.year} items={entry.items} />
      ))}
    </div>
  );
}
