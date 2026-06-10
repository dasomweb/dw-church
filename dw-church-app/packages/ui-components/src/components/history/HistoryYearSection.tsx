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
      {/* Year header — a filled brand badge so each era reads clearly */}
      <div className="mb-5 flex items-center gap-3">
        <span className="inline-flex items-center rounded-full bg-primary px-3.5 py-1 text-sm font-bold text-white shadow-sm">{year}</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Timeline items — filled dots + a soft card per entry */}
      <div className="relative ml-4 border-l-2 border-primary/20 pl-6">
        {items.map((item) => (
          <div key={item.id} className="relative pb-5 last:pb-0">
            <div className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full bg-primary ring-4 ring-primary/15" />
            <div className="rounded-xl border border-black/[0.05] bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md">
              <HistoryItem item={item} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
