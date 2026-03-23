import type { HistoryItem as HistoryItemType } from '@dw-church/api-client';
import { HistoryItem } from './HistoryItem';

export interface HistoryYearSectionProps {
  year: number;
  items: HistoryItemType[];
  className?: string;
}

export function HistoryYearSection({ year, items, className = '' }: HistoryYearSectionProps) {
  return (
    <section className={`relative ${className}`}>
      {/* Year Header */}
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-xl font-bold text-primary">{year}</h2>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Timeline Items */}
      <div className="relative ml-4 border-l-2 border-border pl-6">
        {items.map((item) => (
          <div key={item.id} className="relative pb-6 last:pb-0">
            {/* Dot on timeline */}
            <div className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-primary bg-surface" />
            <HistoryItem item={item} />
          </div>
        ))}
      </div>
    </section>
  );
}
