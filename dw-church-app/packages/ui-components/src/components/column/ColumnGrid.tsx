import type { Column } from '@dw-church/api-client';
import { useColumns } from '@dw-church/api-client';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { DateBadge } from '../common/DateBadge';

export interface ColumnGridProps {
  data?: Column[];
  limit?: number;
  className?: string;
  onItemClick?: (id: number) => void;
}

function truncate(text: string, max: number): string {
  if (!text) return '';
  const plain = text.replace(/<[^>]*>/g, '');
  return plain.length > max ? `${plain.slice(0, max)}...` : plain;
}

export function ColumnGrid({ data, limit, className = '', onItemClick }: ColumnGridProps) {
  const { data: response, isLoading } = useColumns(
    data ? undefined : { perPage: limit },
  );

  const columns = data ?? response?.data ?? [];
  const items = limit ? columns.slice(0, limit) : columns;

  if (!data && isLoading) return <LoadingSpinner />;
  if (!items.length) return <EmptyState title="칼럼이 없습니다" />;

  return (
    <div
      className={`dw-grid dw-grid-cols-1 dw-gap-6 sm:dw-grid-cols-2 lg:dw-grid-cols-3 ${className}`}
    >
      {items.map((column) => (
        <article
          key={column.id}
          className={`dw-group dw-overflow-hidden dw-rounded-lg dw-border dw-border-border dw-bg-surface dw-shadow-sm dw-transition-shadow hover:dw-shadow-md ${
            onItemClick ? 'dw-cursor-pointer' : ''
          }`}
          onClick={() => onItemClick?.(column.id)}
          role={onItemClick ? 'button' : undefined}
          tabIndex={onItemClick ? 0 : undefined}
          onKeyDown={(e) => {
            if (onItemClick && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              onItemClick(column.id);
            }
          }}
        >
          {/* Thumbnail */}
          <div className="dw-aspect-[16/9] dw-overflow-hidden dw-bg-surface-alt">
            {column.thumbnailUrl ? (
              <img
                src={column.thumbnailUrl}
                alt={column.title}
                loading="lazy"
                className="dw-h-full dw-w-full dw-object-cover dw-transition-transform group-hover:dw-scale-105"
              />
            ) : (
              <div className="dw-flex dw-h-full dw-w-full dw-items-center dw-justify-center dw-text-text-muted">
                <svg className="dw-h-12 dw-w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="dw-flex dw-flex-col dw-gap-2 dw-p-4">
            <h3 className="dw-line-clamp-2 dw-text-base dw-font-semibold dw-text-text-primary group-hover:dw-text-primary dw-transition-colors">
              {column.title}
            </h3>
            <p className="dw-line-clamp-3 dw-text-sm dw-text-text-secondary">
              {truncate(column.content, 100)}
            </p>
            <DateBadge date={column.createdAt} format="short" />
          </div>
        </article>
      ))}
    </div>
  );
}
