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
    <div className={`dw-flex dw-gap-4 ${className}`}>
      {/* Date Badge */}
      {dateLabel && (
        <div className="dw-flex-shrink-0">
          <span className="dw-inline-block dw-rounded dw-bg-primary/10 dw-px-2.5 dw-py-1 dw-text-xs dw-font-semibold dw-text-primary">
            {dateLabel}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="dw-flex-1">
        <p className="dw-text-sm dw-text-text-primary">{item.content}</p>
        {item.photoUrl && (
          <div className="dw-mt-2 dw-w-32 dw-overflow-hidden dw-rounded">
            <img
              src={item.photoUrl}
              alt={item.content}
              className="dw-h-auto dw-w-full dw-object-cover"
              loading="lazy"
            />
          </div>
        )}
      </div>
    </div>
  );
}
