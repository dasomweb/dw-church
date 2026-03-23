import type { Column } from '@dw-church/api-client';
import { useColumn, useRelatedColumns } from '@dw-church/api-client';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { YoutubeEmbed } from '../common/YoutubeEmbed';
import { RelatedPosts } from '../common/RelatedPosts';
import { DateBadge } from '../common/DateBadge';

export interface PastoralColumnProps {
  data?: Column;
  postId?: string;
  className?: string;
}

export function PastoralColumn({ data, postId, className = '' }: PastoralColumnProps) {
  const id = data?.id ?? postId ?? '';
  const { data: fetched, isLoading } = useColumn(id);
  const { data: relatedColumns } = useRelatedColumns(id);

  const column = data ?? fetched;

  if (!data && isLoading) return <LoadingSpinner />;
  if (!column) return <EmptyState title="칼럼을 찾을 수 없습니다" />;

  return (
    <article className={`mx-auto max-w-3xl ${className}`}>
      {/* Title */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">
          {column.title}
        </h1>
        <div className="mt-2">
          <DateBadge date={column.createdAt} format="long" />
        </div>
      </header>

      {/* Top Image */}
      {column.topImageUrl && (
        <div className="mb-8 overflow-hidden rounded-lg">
          <img
            src={column.topImageUrl}
            alt={column.title}
            className="w-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Content */}
      <div
        className="prose max-w-none text-text-primary"
        dangerouslySetInnerHTML={{ __html: column.content }}
      />

      {/* Bottom Image */}
      {column.bottomImageUrl && (
        <div className="mt-8 overflow-hidden rounded-lg">
          <img
            src={column.bottomImageUrl}
            alt=""
            className="w-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* YouTube Video */}
      {column.youtubeUrl && (
        <div className="mt-8">
          <YoutubeEmbed url={column.youtubeUrl} title={column.title} />
        </div>
      )}

      {/* Related Columns */}
      {relatedColumns && relatedColumns.length > 0 && (
        <RelatedPosts title="관련 칼럼">
          {relatedColumns.map((related) => (
            <article
              key={related.id}
              className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm"
            >
              <div className="aspect-[16/9] overflow-hidden bg-surface-alt">
                {related.thumbnailUrl ? (
                  <img
                    src={related.thumbnailUrl}
                    alt={related.title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-text-muted">
                    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <div className="p-3">
                <h4 className="line-clamp-2 text-sm font-medium text-text-primary">
                  {related.title}
                </h4>
              </div>
            </article>
          ))}
        </RelatedPosts>
      )}
    </article>
  );
}
