import type { Column } from '@dw-church/api-client';
import { useColumns } from '@dw-church/api-client';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { DateBadge } from '../common/DateBadge';

export interface ColumnGridProps {
  data?: Column[];
  limit?: number;
  columns?: number;
  className?: string;
  onItemClick?: (id: string) => void;
}

const GRID_COLS: Record<number, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
};

function truncate(text: string, max: number): string {
  if (!text) return '';
  const plain = text.replace(/<[^>]*>/g, '');
  return plain.length > max ? `${plain.slice(0, max)}...` : plain;
}

export function ColumnGrid({ data, limit, columns: gridColumns = 3, className = '', onItemClick }: ColumnGridProps) {
  const { data: response, isLoading } = useColumns(
    data ? undefined : { perPage: limit },
  );

  const columns = data ?? response?.data ?? [];
  const items = limit ? columns.slice(0, limit) : columns;

  if (!data && isLoading) return <LoadingSpinner />;
  if (!items.length) return <EmptyState title="칼럼이 없습니다" />;

  return (
    <div
      className={`grid ${GRID_COLS[gridColumns] || GRID_COLS[3]} gap-6 ${className}`}
    >
      {items.map((column) => (
        <article
          key={column.id}
          className={`group overflow-hidden rounded-lg border border-border bg-surface shadow-sm transition-shadow hover:shadow-md ${
            onItemClick ? 'cursor-pointer' : ''
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
          <div className="aspect-[16/9] overflow-hidden bg-surface-alt">
            {column.thumbnailUrl ? (
              <img
                src={column.thumbnailUrl}
                alt={column.title}
                loading="lazy"
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-text-muted">
                <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="flex flex-col gap-2 p-4">
            <h3 className="line-clamp-2 text-base font-semibold text-text-primary group-hover:text-primary transition-colors">
              {column.title}
            </h3>
            <p className="line-clamp-3 text-sm text-text-secondary">
              {truncate(column.content, 100)}
            </p>
            <DateBadge date={column.createdAt} format="short" />
          </div>
        </article>
      ))}
    </div>
  );
}
