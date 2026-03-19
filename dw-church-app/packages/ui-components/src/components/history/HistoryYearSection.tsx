import type { HistoryItem as HistoryItemType } from '@dw-church/api-client';
import { HistoryItem } from './HistoryItem';

export interface HistoryYearSectionProps {
  year: number;
  items: HistoryItemType[];
  className?: string;
}

export function HistoryYearSection({ year, items, className = '' }: HistoryYearSectionProps) {
  return (
    <section className={`dw-relative ${className}`}>
      {/* Year Header */}
      <div className="dw-mb-4 dw-flex dw-items-center dw-gap-3">
        <h2 className="dw-text-xl dw-font-bold dw-text-primary">{year}</h2>
        <div className="dw-h-px dw-flex-1 dw-bg-border" />
      </div>

      {/* Timeline Items */}
      <div className="dw-relative dw-ml-4 dw-border-l-2 dw-border-border dw-pl-6">
        {items.map((item) => (
          <div key={item.id} className="dw-relative dw-pb-6 last:dw-pb-0">
            {/* Dot on timeline */}
            <div className="dw-absolute -dw-left-[31px] dw-top-1 dw-h-3 dw-w-3 dw-rounded-full dw-border-2 dw-border-primary dw-bg-surface" />
            <HistoryItem item={item} />
          </div>
        ))}
      </div>
    </section>
  );
}
