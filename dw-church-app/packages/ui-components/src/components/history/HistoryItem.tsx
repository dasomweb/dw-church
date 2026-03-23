import type { HistoryItem as HistoryItemType } from '@dw-church/api-client';

export interface HistoryItemProps {
  item: HistoryItemType;
  className?: string;
}

export function HistoryItem({ item, className = '' }: HistoryItemProps) {
  const dateLabel =
    item.month && item.day
      ? `${item.month}월 ${item.day}일`
      : item.month
        ? `${item.month}월`
        : '';

  return (
    <div className={`flex gap-4 ${className}`}>
      {/* Date Badge */}
      {dateLabel && (
        <div className="flex-shrink-0">
          <span className="inline-block rounded bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            {dateLabel}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1">
        <p className="text-sm text-text-primary">{item.content}</p>
        {item.photoUrl && (
          <div className="mt-2 w-32 overflow-hidden rounded">
            <img
              src={item.photoUrl}
              alt={item.content}
              className="h-auto w-full object-cover"
              loading="lazy"
            />
          </div>
        )}
      </div>
    </div>
  );
}
